import { createAdminClient } from '@/lib/supabase/admin';
import { SPORT_TYPE_THEMES } from '@/lib/ai/theme-config';
import { sourceDisplayName } from '@/lib/constants/event-sources';
import { aggregatorNotice, persistScrapedCoverUrl, SCRAPE_ETHICS } from '@/lib/scrape/ethics';
import { classifyListingAudience } from '@/lib/events/audience';
import { boroughSlugForEvent, tagScrapedEventLocation } from '@/lib/scrape/tag-location';
import { scrapeTextListing } from '@/lib/scrape/adapters/_text-listing';
import {
  URL_PROCESS_TIMEOUT_MS,
  withUrlProcessingTimeout,
} from '@/lib/scrape/fetch';
import { SCRAPING_SOURCES } from '@/lib/scrape/scraping-sources';
import {
  recordAdapterResult,
  recordUrlResult,
  shouldSkipAdapter,
  shouldSkipUrl,
} from '@/lib/scrape/source-health';
import {
  DEFAULT_COVERS,
  VENUE_SEEDS,
  type AdapterResult,
  type NormalizedScrapedEvent,
  type ScrapeAdapterId,
  type ScrapeRunReport,
} from '@/lib/scrape/types';
import {
  isEdgeScrapeRuntime,
  loadNamedScraper,
  scrapeSlotIndex,
  SCRAPE_ADAPTER_IDS,
  type ScraperFn,
} from '@/lib/scrape/adapter-registry';
import { hasValidServiceRoleKey } from '@/lib/db/service-role';
import { cleanupDuplicateEventsByIdentity } from '@/lib/scrape/cleanup-duplicate-events';
import {
  prepareScrapedEventsForUpsert,
  pickSoftIdentityMatch,
  softMatchWindow,
} from '@/lib/scrape/dedupe-identity';

type UpsertStats = { created: number; updated: number; skipped: number; unchanged: number };

/** Cached probe for optional audience columns (migration may not be applied yet). */
let audienceColumnsAvailable: boolean | null = null;

async function supportsAudienceColumns(supabase: ReturnType<typeof createAdminClient>): Promise<boolean> {
  if (audienceColumnsAvailable != null) return audienceColumnsAvailable;
  const { error } = await supabase.from('events').select('for_kids, for_women').limit(1);
  audienceColumnsAvailable = !error;
  return audienceColumnsAvailable;
}

/** Midnight venue crawl — 4s between requests (polite, never burst). */
const BETWEEN_URL_MS = 4000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

async function specializedAdapterForUrl(
  url: string,
): Promise<{ id: ScrapeAdapterId; run: ScraperFn } | null> {
  const host = hostnameOf(url);
  if (!host) return null;
  const source = SCRAPING_SOURCES.find(
    (item) => item.adapterId && hostnameOf(item.url) === host,
  );
  if (!source?.adapterId) return null;
  const run = await loadNamedScraper(source.adapterId);
  if (!run) return null;
  return { id: source.adapterId, run };
}

async function ensureVenues(): Promise<Map<string, string>> {
  const supabase = createAdminClient();
  const map = new Map<string, string>();

  for (const seed of VENUE_SEEDS) {
    // Identity order: city+name → city+address → city+website+name.
    // Never match on website_url alone (shared Form Factory / padel domains).
    const { data: byName } = await supabase
      .from('venues')
      .select('id')
      .eq('city', seed.city)
      .ilike('name', seed.name)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const { data: byAddress } =
      byName?.id || !seed.address || seed.address === seed.city
        ? { data: null }
        : await supabase
            .from('venues')
            .select('id')
            .eq('city', seed.city)
            .ilike('address', seed.address)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

    const { data: byWebsiteName } =
      byName?.id || byAddress?.id
        ? { data: null }
        : await supabase
            .from('venues')
            .select('id')
            .eq('city', seed.city)
            .eq('website_url', seed.websiteUrl)
            .ilike('name', seed.name)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

    const existing = byName ?? byAddress ?? byWebsiteName;

    if (existing?.id) {
      await supabase
        .from('venues')
        .update({
          name: seed.name,
          website_url: seed.websiteUrl,
          latitude: seed.latitude,
          longitude: seed.longitude,
          address: seed.address,
          sports: seed.sports,
          ...(seed.district ? { district: seed.district } : {}),
        })
        .eq('id', existing.id);
      map.set(seed.key, existing.id);
      continue;
    }

    const { data: created, error } = await supabase
      .from('venues')
      .insert({
        name: seed.name,
        address: seed.address,
        city: seed.city,
        sports: seed.sports,
        latitude: seed.latitude,
        longitude: seed.longitude,
        website_url: seed.websiteUrl,
        verified: true,
        ...(seed.district ? { district: seed.district } : {}),
      })
      .select('id')
      .single();

    if (error || !created) {
      console.error('[scrape.ensureVenues]', seed.key, error?.message);
      continue;
    }
    map.set(seed.key, created.id);
  }

  return map;
}

function skillFromTitle(title: string): { min: number | null; max: number | null } {
  if (/kategorie\s*[-–]?\s*d\b|za[cč]iato[cč]/i.test(title)) return { min: 1, max: 2 };
  if (/kategorie\s*[-–]?\s*c\b|mierne/i.test(title)) return { min: 2, max: 3 };
  if (/kategorie\s*[-–]?\s*b\b|pokro[cč]il/i.test(title) && !/expert/i.test(title)) {
    return { min: 3, max: 4 };
  }
  if (/kategorie\s*[-–]?\s*a\b|expert/i.test(title)) return { min: 4, max: 5 };
  return { min: null, max: null };
}

function isoEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return new Date(a).getTime() === new Date(b).getTime();
}

function strEq(a: unknown, b: unknown): boolean {
  const left = a == null || a === '' ? null : String(a);
  const right = b == null || b === '' ? null : String(b);
  return left === right;
}

function numEq(a: unknown, b: unknown): boolean {
  const left = a == null ? null : Number(a);
  const right = b == null ? null : Number(b);
  if (left === null && right === null) return true;
  if (left === null || right === null) return false;
  return left === right;
}

async function syncVenueBorough(
  venueId: string | null,
  event: NormalizedScrapedEvent,
): Promise<void> {
  if (!venueId) return;
  const districtSlug = boroughSlugForEvent(event);
  if (!districtSlug) return;
  const supabase = createAdminClient();
  await supabase.from('venues').update({ district: districtSlug }).eq('id', venueId);
}

/**
 * After a weekly studio calendar scrape, drop leftover slots for that week that
 * are no longer on the site (wrong day / legacy ids / cancelled classes).
 */
async function pruneStaleScheduleClasses(
  events: NormalizedScrapedEvent[],
  opts: {
    source: string;
    sourceUrlIncludes: string;
    idPrefix: string;
    minFresh: number;
  },
): Promise<number> {
  const fresh = events.filter(
    (e) =>
      e.source === opts.source &&
      Boolean(e.sourceUrl?.includes(opts.sourceUrlIncludes)) &&
      e.externalId.startsWith(`${opts.idPrefix}-class-`),
  );
  if (fresh.length < opts.minFresh) {
    console.warn(
      `[scrape.pruneSchedule] skip ${opts.source} — only ${fresh.length} ${opts.idPrefix}-class slots (need ≥${opts.minFresh})`,
    );
    return 0;
  }

  const times = fresh.map((e) => e.startsAt.getTime());
  const minIso = new Date(Math.min(...times) - 12 * 3600_000).toISOString();
  const maxIso = new Date(Math.max(...times) + 36 * 3600_000).toISOString();
  const keep = new Set(fresh.map((e) => e.externalId));

  const supabase = createAdminClient();
  const { data: rows, error } = await supabase
    .from('events')
    .select('id, external_id')
    .eq('source', opts.source)
    .ilike('source_url', `%${opts.sourceUrlIncludes}%`)
    .gte('starts_at', minIso)
    .lte('starts_at', maxIso);

  if (error || !rows?.length) return 0;

  const staleIds = rows
    .filter((row) => row.external_id && !keep.has(row.external_id))
    .map((row) => row.id as string);

  if (staleIds.length === 0) return 0;

  const { error: delError } = await supabase.from('events').delete().in('id', staleIds);
  if (delError) {
    console.warn('[scrape.pruneSchedule]', opts.source, delError.message);
    return 0;
  }
  return staleIds.length;
}

async function pruneStaleFitCampClasses(
  events: NormalizedScrapedEvent[],
): Promise<number> {
  return pruneStaleScheduleClasses(events, {
    source: 'form-factory',
    sourceUrlIncludes: 'fitcamp.formfactory.sk/calendar',
    idPrefix: 'ff',
    minFresh: 40,
  });
}

async function pruneStaleWeeklyAdapters(
  events: NormalizedScrapedEvent[],
): Promise<number> {
  let total = 0;
  total += await pruneStaleFitCampClasses(events);
  total += await pruneStaleScheduleClasses(events, {
    source: 'ofa-mma',
    sourceUrlIncludes: 'ofa-gym.sk',
    idPrefix: 'ofa',
    minFresh: 8,
  });
  total += await pruneStaleScheduleClasses(events, {
    source: 'prostor',
    sourceUrlIncludes: 'crossfitproton.sk',
    idPrefix: 'proton',
    minFresh: 20,
  });
  return total;
}

async function coverForEvent(
  event: NormalizedScrapedEvent,
  _venueId: string | null,
): Promise<string | null> {
  // Scraped events always require AI graphics — never persist third-party photos.
  // Cover factory uses `sharp` (Node-only); Edge cron uses SportSync plates.
  if (event.source === 'form-factory') return null;
  if (SCRAPE_ETHICS.allowThirdPartyMedia && event.coverUrl && event.requiresAiGraphic === false) {
    return event.coverUrl;
  }
  return DEFAULT_COVERS[event.sport] ?? DEFAULT_COVERS.OTHER ?? DEFAULT_COVERS.FITNESS!;
}

function withAggregatorDescription(
  event: NormalizedScrapedEvent,
  sourceName: string,
): string | null {
  const base = (event.description ?? '').trim();
  const notice = aggregatorNotice(sourceName, event.sourceUrl ?? event.ticketUrl);
  if (!base) return notice;
  if (base.includes('SportSync zobrazuje textový prehľad')) return base.slice(0, 600);
  return `${base.slice(0, 400)}\n\n${notice}`.slice(0, 600);
}

async function upsertEvents(
  events: NormalizedScrapedEvent[],
  venueIds: Map<string, string>,
): Promise<UpsertStats> {
  const supabase = createAdminClient();
  const stats: UpsertStats = { created: 0, updated: 0, skipped: 0, unchanged: 0 };
  const hasAudience = await supportsAudienceColumns(supabase);

  for (const raw of events) {
    const event = tagScrapedEventLocation(raw);
    const venueId = venueIds.get(event.venueKey) ?? null;
    const venue = VENUE_SEEDS.find((v) => v.key === event.venueKey);
    const theme = SPORT_TYPE_THEMES[event.sportType] ?? SPORT_TYPE_THEMES.OTHER;
    const priceCents = event.priceCents ?? 0;
    const sourceName = sourceDisplayName(event.source);
    const description = withAggregatorDescription(event, sourceName);
    const startsAt = event.startsAt.toISOString();
    await syncVenueBorough(venueId, event);

    const { data: byExternal } = await supabase
      .from('events')
      .select(
        'id, title, description, sport, sport_type, starts_at, price_cents, capacity, registered_count, venue_id, source_url, ticket_url, source_name, is_aggregated, cover_url, participation_mode, for_kids, for_women',
      )
      .eq('source', event.source)
      .eq('external_id', event.externalId)
      .maybeSingle();

    const existing = byExternal;

    // Same title + local date/time already stored under another id → skip insert.
    if (!existing?.id) {
      const window = softMatchWindow(event.startsAt);
      const { data: near } = await supabase
        .from('events')
        .select('id, title, starts_at')
        .gte('starts_at', window.from)
        .lte('starts_at', window.to)
        .neq('status', 'cancelled')
        .limit(25);
      const soft = pickSoftIdentityMatch(near ?? [], event.title, event.startsAt);
      if (soft?.id) {
        await supabase
          .from('events')
          .update({ scraped_at: new Date().toISOString() })
          .eq('id', soft.id);
        stats.unchanged += 1;
        continue;
      }
    }

    const { forKids, forWomen } = classifyListingAudience({
      title: event.title,
      description,
      sourceUrl: event.sourceUrl,
      venueName: venue?.name ?? event.locationName,
      sourceName,
      locationName: event.locationName,
      forKids: event.forKids,
      forWomen: event.forWomen,
    });

    // Compare factual fields first — avoid Cover Factory / write when nothing changed
    if (existing?.id) {
      const same =
        strEq(existing.title, event.title) &&
        strEq(existing.sport, event.sport) &&
        isoEqual(existing.starts_at as string, startsAt) &&
        numEq(existing.price_cents, priceCents) &&
        numEq(existing.capacity, event.capacity ?? null) &&
        numEq(existing.registered_count, event.registeredCount ?? 0) &&
        strEq(existing.venue_id, venueId) &&
        strEq(existing.source_url, event.sourceUrl ?? null) &&
        strEq(existing.ticket_url, event.ticketUrl ?? null) &&
        strEq(existing.participation_mode, event.participationMode) &&
        (!hasAudience ||
          (Boolean((existing as { for_kids?: boolean | null }).for_kids) === forKids &&
            Boolean((existing as { for_women?: boolean | null }).for_women) === forWomen)) &&
        Boolean(existing.is_aggregated) === SCRAPE_ETHICS.isAggregatedRedirector;

      if (same) {
        // Touch scraped_at only — proves last successful poll without rewriting content
        const touch: { scraped_at: string; cover_url?: null; photos?: string[] } = {
          scraped_at: new Date().toISOString(),
        };
        if (event.source === 'form-factory' && existing.cover_url) {
          touch.cover_url = null;
          touch.photos = [];
        }
        await supabase.from('events').update(touch).eq('id', existing.id);
        stats.unchanged += 1;
        continue;
      }
    }

    // Keep only Cover Factory / SportSync plates — never venue CDN photos.
    let cover = persistScrapedCoverUrl(
      event.source,
      existing?.cover_url as string | null,
      await coverForEvent(event, venueId),
    );

    const row = {
      type: 'official',
      status: 'open',
      sport: event.sport,
      sport_type: event.sportType,
      title: event.title,
      description,
      cover_url: cover,
      city: event.city,
      starts_at: startsAt,
      event_date: startsAt,
      start_time: startsAt,
      price: priceCents / 100,
      price_cents: priceCents,
      currency: 'EUR',
      capacity: event.capacity ?? null,
      max_participants: event.capacity ?? null,
      registered_count: event.registeredCount ?? 0,
      latitude: venue?.latitude ?? 48.1486,
      longitude: venue?.longitude ?? 17.1077,
      venue_id: venueId,
      organizer_id: null,
      source: event.source,
      external_id: event.externalId,
      source_url: event.sourceUrl ?? null,
      source_name: sourceName,
      is_aggregated: SCRAPE_ETHICS.isAggregatedRedirector,
      ticket_url: event.ticketUrl ?? null,
      scraped_at: new Date().toISOString(),
      participation_mode: event.participationMode,
      theme_config: theme,
      ai_enriched: false,
      // Never store scraped venue galleries
      photos: [],
      sponsors_json: [],
    };

    // Optional columns — only write when present.
    if (hasAudience) {
      (row as { for_kids?: boolean; for_women?: boolean }).for_kids = forKids;
      (row as { for_kids?: boolean; for_women?: boolean }).for_women = forWomen;
    }

    if (existing?.id) {
      // Recompute cover when identity changed or existing cover is third-party media
      const identityChanged =
        !strEq(existing.title, event.title) ||
        !strEq(existing.sport, event.sport) ||
        !strEq(existing.venue_id, venueId);
      if (identityChanged || event.source === 'form-factory') {
        row.cover_url = persistScrapedCoverUrl(
          event.source,
          null,
          await coverForEvent(event, venueId),
        );
      }

      const { error } = await supabase.from('events').update(row).eq('id', existing.id);
      if (error) {
        console.error('[scrape.upsert event update]', error.message);
        stats.skipped += 1;
      } else {
        stats.updated += 1;
      }
      continue;
    }

    const { error } = await supabase.from('events').insert(row);
    if (error) {
      console.error('[scrape.upsert event insert]', error.message);
      stats.skipped += 1;
    } else {
      stats.created += 1;
    }
  }

  return stats;
}

async function upsertTournaments(
  tournaments: NormalizedScrapedEvent[],
  venueIds: Map<string, string>,
): Promise<UpsertStats> {
  const supabase = createAdminClient();
  const stats: UpsertStats = { created: 0, updated: 0, skipped: 0, unchanged: 0 };
  const hasAudience = await supportsAudienceColumns(supabase);

  for (const raw of tournaments) {
    const item = tagScrapedEventLocation(raw);
    const venueId = venueIds.get(item.venueKey) ?? null;
    const venue = VENUE_SEEDS.find((v) => v.key === item.venueKey);
    const priceCents = item.priceCents ?? 0;
    const skill = skillFromTitle(item.title);
    const maxParticipants = item.capacity && item.capacity > 0 ? item.capacity : 8;
    const sourceName = sourceDisplayName(item.source);
    const description = withAggregatorDescription(item, sourceName);
    const startsAt = item.startsAt.toISOString();
    await syncVenueBorough(venueId, item);
    const { forKids, forWomen } = classifyListingAudience({
      title: item.title,
      description,
      sourceUrl: item.sourceUrl,
      venueName: venue?.name ?? item.locationName,
      sourceName,
      locationName: item.locationName,
      forKids: item.forKids,
      forWomen: item.forWomen,
    });

    const { data: existing } = await supabase
      .from('tournaments')
      .select(
        'id, name, description, sport, starts_at, entry_fee, max_participants, current_participants, venue_id, source_url, ticket_url, cover_url, for_kids, for_women',
      )
      .eq('source', item.source)
      .eq('external_id', item.externalId)
      .maybeSingle();

    if (existing?.id) {
      const same =
        strEq(existing.name, item.title) &&
        strEq(existing.sport, item.sport) &&
        isoEqual(existing.starts_at as string, startsAt) &&
        numEq(existing.entry_fee, priceCents / 100) &&
        numEq(existing.max_participants, maxParticipants) &&
        numEq(existing.current_participants, item.registeredCount ?? 0) &&
        strEq(existing.venue_id, venueId) &&
        strEq(existing.source_url, item.sourceUrl ?? null) &&
        strEq(existing.ticket_url, item.ticketUrl ?? null) &&
        (!hasAudience ||
          (Boolean((existing as { for_kids?: boolean | null }).for_kids) === forKids &&
            Boolean((existing as { for_women?: boolean | null }).for_women) === forWomen));

      if (same) {
        const touch: { scraped_at: string; cover_url?: null } = {
          scraped_at: new Date().toISOString(),
        };
        if (item.source === 'form-factory' && existing.cover_url) {
          touch.cover_url = null;
        }
        await supabase.from('tournaments').update(touch).eq('id', existing.id);
        stats.unchanged += 1;
        continue;
      }
    }

    const keepExistingCover =
      strEq(existing?.name, item.title) &&
      strEq(existing?.sport, item.sport) &&
      strEq(existing?.venue_id, venueId);
    const cover = persistScrapedCoverUrl(
      item.source,
      keepExistingCover ? (existing?.cover_url as string | null) : null,
      await coverForEvent(item, venueId),
    );

    const row: Record<string, unknown> = {
      organizer_id: null,
      venue_id: venueId,
      name: item.title,
      description,
      sport: item.sport,
      format: 'SINGLE_ELIMINATION',
      status: 'REGISTRATION_OPEN',
      skill_level_min: skill.min,
      skill_level_max: skill.max,
      entry_fee: priceCents / 100,
      max_participants: maxParticipants,
      current_participants: item.registeredCount ?? 0,
      cover_url: cover,
      city: item.city,
      latitude: venue?.latitude ?? 48.1486,
      longitude: venue?.longitude ?? 17.1077,
      starts_at: startsAt,
      ends_at: null,
      registration_deadline: startsAt,
      source: item.source,
      external_id: item.externalId,
      source_url: item.sourceUrl ?? null,
      ticket_url: item.ticketUrl ?? null,
      scraped_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (hasAudience) {
      row.for_kids = forKids;
      row.for_women = forWomen;
    }

    if (existing?.id) {
      const { error } = await supabase.from('tournaments').update(row).eq('id', existing.id);
      if (error) {
        console.error('[scrape.upsert tournament update]', error.message);
        stats.skipped += 1;
      } else {
        stats.updated += 1;
      }
      continue;
    }

    const { error } = await supabase.from('tournaments').insert(row);
    if (error) {
      console.error('[scrape.upsert tournament insert]', error.message);
      stats.skipped += 1;
    } else {
      stats.created += 1;
    }
  }

  return stats;
}

async function persistAdapterResults(results: AdapterResult[]): Promise<ScrapeRunReport> {
  // Node `pg` fallback (`store-pg`) is not loaded here — Cloudflare Edge cannot
  // resolve that module. Cron/Edge always writes through Supabase REST.
  if (!hasValidServiceRoleKey()) {
    throw new Error(
      '[scrape] SUPABASE_SERVICE_ROLE_KEY missing/placeholder — required on Edge runtime.',
    );
  }

  const venueIds = await ensureVenues();

  const extraVenueIds = new Map<string, string>();
  for (const event of results.flatMap((r) => r.events)) {
    if (/^[0-9a-f-]{36}$/i.test(event.venueKey)) {
      extraVenueIds.set(event.venueKey, event.venueKey);
    }
  }
  for (const [key, id] of extraVenueIds) venueIds.set(key, id);

  const all = results.flatMap((r) => r.events);
  const tournamentItems = prepareScrapedEventsForUpsert(
    all.filter((e) => e.category === 'tournament'),
  );
  const eventItems = prepareScrapedEventsForUpsert(
    all.filter((e) => e.category !== 'tournament'),
  );

  const eventStats = await upsertEvents(eventItems, venueIds);
  const tournamentStats = await upsertTournaments(tournamentItems, venueIds);

  try {
    const pruned = await pruneStaleWeeklyAdapters(eventItems);
    if (pruned > 0) {
      console.log('[scrape] pruned stale weekly schedule classes', pruned);
    }
  } catch (err) {
    console.warn(
      '[scrape] weekly schedule prune failed:',
      err instanceof Error ? err.message : err,
    );
  }

  try {
    const dedupe = await cleanupDuplicateEventsByIdentity();
    if (dedupe.deleted > 0) {
      console.log('[scrape] removed duplicate events', dedupe);
    }
  } catch (err) {
    console.warn(
      '[scrape] duplicate cleanup failed:',
      err instanceof Error ? err.message : err,
    );
  }

  return {
    created: eventStats.created + tournamentStats.created,
    updated: eventStats.updated + tournamentStats.updated,
    skipped: eventStats.skipped + tournamentStats.skipped,
    unchanged: eventStats.unchanged + tournamentStats.unchanged,
    adapters: results.map((r) => ({
      source: r.source,
      count: r.events.length,
      error: r.error,
    })),
  };
}

/** Safety cap when an adapter fetches + parses multiple pages in one run. */
const ADAPTER_RUN_TIMEOUT_MS = URL_PROCESS_TIMEOUT_MS * 6;

async function executeNamedAdapter(id: ScrapeAdapterId): Promise<AdapterResult> {
  if (await shouldSkipAdapter(id)) {
    console.warn(`[scrape] skipping unhealthy adapter ${id}`);
    return {
      source: id,
      events: [],
      error: 'skipped: source marked unhealthy (3+ consecutive failures)',
    };
  }

  const run = await loadNamedScraper(id);
  if (!run) {
    return { source: id, events: [], error: `unknown adapter ${id}` };
  }

  const timeoutMs = isEdgeScrapeRuntime()
    ? Math.min(ADAPTER_RUN_TIMEOUT_MS, 18_000)
    : ADAPTER_RUN_TIMEOUT_MS;

  try {
    return await withUrlProcessingTimeout(`adapter:${id}`, () => run(), timeoutMs);
  } catch (err) {
    console.warn(`[scrape] adapter ${id} failed:`, err instanceof Error ? err.message : err);
    return {
      source: id,
      events: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function runScrapersSequentially(): Promise<AdapterResult[]> {
  const results: AdapterResult[] = [];
  for (const id of SCRAPE_ADAPTER_IDS) {
    const result = await executeNamedAdapter(id);
    await recordAdapterResult(result);
    results.push(result);
  }
  return results;
}

export async function runAllScrapers(): Promise<ScrapeRunReport> {
  if (isEdgeScrapeRuntime()) {
    throw new Error(
      'runAllScrapers is Node-only. Cloudflare Edge must call runScrapeAdapterShard() (1 adapter / isolate).',
    );
  }
  const results = await runScrapersSequentially();
  return persistAdapterResults(results);
}

/** Node-only: run a subset of adapters then upsert (local rescrape / ops). */
export async function runNamedScrapers(ids: ScrapeAdapterId[]): Promise<ScrapeRunReport> {
  if (isEdgeScrapeRuntime()) {
    throw new Error(
      'runNamedScrapers is Node-only. Cloudflare Edge must call runScrapeAdapterShard().',
    );
  }
  const results: AdapterResult[] = [];
  for (const id of ids) {
    const result = await executeNamedAdapter(id);
    await recordAdapterResult(result);
    results.push(result);
  }
  return persistAdapterResults(results);
}

export interface ScrapeShardReport extends ScrapeRunReport {
  adapter: ScrapeAdapterId;
  slot: number;
  totalAdapters: number;
  /** True when this isolate parsed HTML (vs skipped). */
  edgeSafe: true;
}

/** Cloudflare / Edge cron: exactly one adapter, then persist. */
export async function runScrapeAdapterShard(slot = scrapeSlotIndex()): Promise<ScrapeShardReport> {
  const total = SCRAPE_ADAPTER_IDS.length;
  const index = ((slot % total) + total) % total;
  const adapter = SCRAPE_ADAPTER_IDS[index]!;
  const result = await executeNamedAdapter(adapter);
  await recordAdapterResult(result);
  const persisted = await persistAdapterResults([result]);
  return {
    ...persisted,
    adapter,
    slot: index,
    totalAdapters: total,
    edgeSafe: true,
  };
}

export interface RunScraperReport extends ScrapeRunReport {
  urls: number;
  dryRun: boolean;
}

/**
 * Scrape a list of venue website URLs sequentially.
 * Full lists are Node-only; Edge cron uses {@link runScrapeAdapterShard}.
 */
export async function runScraper(
  urls: string[],
  dryRun = false,
): Promise<RunScraperReport> {
  const unique = [
    ...new Set(
      urls
        .map((u) => u.trim())
        .filter((u) => {
          try {
            const parsed = new URL(u);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
          } catch {
            return false;
          }
        }),
    ),
  ];

  if (isEdgeScrapeRuntime() && unique.length > 1) {
    throw new Error(
      'runScraper on Edge accepts at most 1 URL. Use runScrapeAdapterShard() or Node scrape:events.',
    );
  }

  const supabase = createAdminClient();
  const { data: venueRows, error: venueError } = await supabase
    .from('venues')
    .select('id, name, website_url, sports, city')
    .not('website_url', 'is', null);
  if (venueError) {
    throw new Error(`[scrape] venues lookup failed: ${venueError.message}`);
  }
  const venues = (venueRows ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    websiteUrl: (row.website_url as string | null) ?? null,
    sports: (row.sports as string[] | null) ?? [],
    city: (row.city as string | null) ?? '',
  }));
  const venueByHost = new Map<string, (typeof venues)[number]>();
  for (const venue of venues) {
    const host = hostnameOf(venue.websiteUrl ?? '');
    if (host && !venueByHost.has(host)) venueByHost.set(host, venue);
  }

  const results: AdapterResult[] = [];
  const ranAdapters = new Set<ScrapeAdapterId>();

  for (let i = 0; i < unique.length; i++) {
    if (i > 0) {
      await sleep(BETWEEN_URL_MS + Math.floor(Math.random() * 400));
    }

    const url = unique[i]!;
    if (await shouldSkipUrl(url)) {
      console.warn(`[scrape] skipping unhealthy URL ${url}`);
      results.push({
        source: 'venue-web',
        events: [],
        error: `skipped: unhealthy URL ${url}`,
      });
      continue;
    }

    const specialized = await specializedAdapterForUrl(url);
    if (specialized) {
      if (ranAdapters.has(specialized.id)) continue;
      if (await shouldSkipAdapter(specialized.id)) {
        console.warn(`[scrape] skipping unhealthy adapter ${specialized.id}`);
        results.push({
          source: specialized.id,
          events: [],
          error: 'skipped: source marked unhealthy (3+ consecutive failures)',
        });
        continue;
      }
      ranAdapters.add(specialized.id);
      let result: AdapterResult;
      try {
        result = await withUrlProcessingTimeout(`adapter:${specialized.id}`, () =>
          specialized.run(),
        );
      } catch (error) {
        result = {
          source: specialized.id,
          events: [],
          error: error instanceof Error ? error.message : String(error),
        };
      }
      await recordAdapterResult(result, { url });
      results.push(result);
      continue;
    }

    const venue = venueByHost.get(hostnameOf(url) ?? '') ?? null;
    const sport = venue?.sports[0] ?? 'OTHER';
    let result: AdapterResult;
    try {
      result = await withUrlProcessingTimeout(url, () =>
        scrapeTextListing({
          source: 'venue-web',
          sport,
          venueKey: venue?.id ?? 'unknown',
          city: venue?.city || 'Bratislava',
          urls: [url],
          defaultCategory: 'match',
          maxEvents: 25,
        }),
      );
    } catch (error) {
      result = {
        source: 'venue-web',
        events: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
    await recordUrlResult({
      url,
      eventCount: result.events.length,
      error: result.error ?? null,
      name: venue?.name ?? null,
    });
    results.push(result);
  }

  if (dryRun) {
    return {
      created: 0,
      updated: 0,
      skipped: 0,
      unchanged: 0,
      adapters: results.map((r) => ({
        source: r.source,
        count: r.events.length,
        error: r.error,
      })),
      urls: unique.length,
      dryRun: true,
    };
  }

  const persisted = await persistAdapterResults(results);
  return { ...persisted, urls: unique.length, dryRun: false };
}
