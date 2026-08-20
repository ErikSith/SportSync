import { createAdminClient } from '@/lib/supabase/admin';
import { SPORT_TYPE_THEMES } from '@/lib/ai/theme-config';
import { sourceDisplayName } from '@/lib/constants/event-sources';
import { aggregatorNotice, SCRAPE_ETHICS } from '@/lib/scrape/ethics';
import { classifyListingAudience } from '@/lib/events/audience';
import { boroughSlugForEvent, tagScrapedEventLocation } from '@/lib/scrape/tag-location';
import { scrapeTextListing } from '@/lib/scrape/adapters/_text-listing';
import { SCRAPING_SOURCES } from '@/lib/scrape/scraping-sources';
import {
  DEFAULT_COVERS,
  VENUE_SEEDS,
  type AdapterResult,
  type NormalizedScrapedEvent,
  type ScrapeAdapterId,
  type ScrapeRunReport,
} from '@/lib/scrape/types';
import { scrapeSkSlovan } from '@/lib/scrape/adapters/sk-slovan';
import { scrapeHcSlovan } from '@/lib/scrape/adapters/hc-slovan';
import { scrapeGopassArena } from '@/lib/scrape/adapters/gopass-arena';
import { scrapeFormFactory } from '@/lib/scrape/adapters/form-factory';
import { scrapeAurialPadel } from '@/lib/scrape/adapters/aurial-padel';
import { scrapeStz } from '@/lib/scrape/adapters/stz';
import { scrapePredpredaj } from '@/lib/scrape/adapters/predpredaj';
import { scrapeCitylife } from '@/lib/scrape/adapters/citylife';
import { scrapePadelBa } from '@/lib/scrape/adapters/padel-ba';
import { scrapeNtcBa } from '@/lib/scrape/adapters/ntc-ba';
import { scrapeOfaMma } from '@/lib/scrape/adapters/ofa-mma';
import { scrapeChaosMma } from '@/lib/scrape/adapters/chaos-mma';
import { scrapeProstor } from '@/lib/scrape/adapters/prostor';
import { scrapeWakelake } from '@/lib/scrape/adapters/wakelake';
import { scrapeDivokaVoda } from '@/lib/scrape/adapters/divoka-voda';
import { scrapePbcBowling } from '@/lib/scrape/adapters/pbc-bowling';
import { scrapeBncBa } from '@/lib/scrape/adapters/bnc-ba';
import { scrapeSipkySk } from '@/lib/scrape/adapters/sipky-sk';
import { scrapeBaMarathon } from '@/lib/scrape/adapters/ba-marathon';
import { scrapeStupavaTrophy } from '@/lib/scrape/adapters/stupava-trophy';
import { scrapeHorskyBeh } from '@/lib/scrape/adapters/horsky-beh';
import { scrapeTopligaBa } from '@/lib/scrape/adapters/topliga-ba';
import { scrapeArealNevadzova } from '@/lib/scrape/adapters/areal-nevadzova';
import { scrapeK2Lezenie } from '@/lib/scrape/adapters/k2-lezenie';
import { scrapeBlockDock } from '@/lib/scrape/adapters/block-dock';
import { scrapeNivyZone } from '@/lib/scrape/adapters/nivy-zone';
import { hasValidServiceRoleKey } from '@/lib/db/service-role';
import { cleanupDuplicateEventsByIdentity } from '@/lib/scrape/cleanup-duplicate-events';
import {
  prepareScrapedEventsForUpsert,
  pickSoftIdentityMatch,
  softMatchWindow,
} from '@/lib/scrape/dedupe-identity';

type ScraperFn = () => Promise<AdapterResult>;

type UpsertStats = { created: number; updated: number; skipped: number; unchanged: number };

/** Cached probe for optional audience columns (migration may not be applied yet). */
let audienceColumnsAvailable: boolean | null = null;

async function supportsAudienceColumns(supabase: ReturnType<typeof createAdminClient>): Promise<boolean> {
  if (audienceColumnsAvailable != null) return audienceColumnsAvailable;
  const { error } = await supabase.from('events').select('for_kids, for_women').limit(1);
  audienceColumnsAvailable = !error;
  return audienceColumnsAvailable;
}

/** Bratislava 20 + legacy feed adapters. Run sequentially to respect rate limits. */
const NAMED_SCRAPERS: Array<{ id: ScrapeAdapterId; run: ScraperFn }> = [
  { id: 'aurial-padel', run: scrapeAurialPadel },
  { id: 'padel-ba', run: scrapePadelBa },
  { id: 'ntc-ba', run: scrapeNtcBa },
  { id: 'ofa-mma', run: scrapeOfaMma },
  { id: 'chaos-mma', run: scrapeChaosMma },
  { id: 'prostor', run: scrapeProstor },
  { id: 'wakelake', run: scrapeWakelake },
  { id: 'divoka-voda', run: scrapeDivokaVoda },
  { id: 'pbc-bowling', run: scrapePbcBowling },
  { id: 'bnc-ba', run: scrapeBncBa },
  { id: 'sipky-sk', run: scrapeSipkySk },
  { id: 'ba-marathon', run: scrapeBaMarathon },
  { id: 'stupava-trophy', run: scrapeStupavaTrophy },
  { id: 'horsky-beh', run: scrapeHorskyBeh },
  { id: 'topliga-ba', run: scrapeTopligaBa },
  { id: 'areal-nevadzova', run: scrapeArealNevadzova },
  { id: 'k2-lezenie', run: scrapeK2Lezenie },
  { id: 'block-dock', run: scrapeBlockDock },
  { id: 'form-factory', run: scrapeFormFactory },
  { id: 'nivy-zone', run: scrapeNivyZone },
  { id: 'sk-slovan', run: scrapeSkSlovan },
  { id: 'hc-slovan', run: scrapeHcSlovan },
  { id: 'gopass-arena', run: scrapeGopassArena },
  { id: 'stz', run: scrapeStz },
  { id: 'predpredaj', run: scrapePredpredaj },
  { id: 'citylife', run: scrapeCitylife },
];

const SCRAPER_BY_ID = new Map<ScrapeAdapterId, ScraperFn>(
  NAMED_SCRAPERS.map((entry) => [entry.id, entry.run]),
);

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

function specializedAdapterForUrl(url: string): { id: ScrapeAdapterId; run: ScraperFn } | null {
  const host = hostnameOf(url);
  if (!host) return null;
  const source = SCRAPING_SOURCES.find(
    (item) => item.adapterId && hostnameOf(item.url) === host,
  );
  if (!source?.adapterId) return null;
  const run = SCRAPER_BY_ID.get(source.adapterId);
  if (!run) return null;
  return { id: source.adapterId, run };
}

async function ensureVenues(): Promise<Map<string, string>> {
  const supabase = createAdminClient();
  const map = new Map<string, string>();

  for (const seed of VENUE_SEEDS) {
    const { data: existing } = await supabase
      .from('venues')
      .select('id')
      .eq('city', seed.city)
      .ilike('name', seed.name)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from('venues')
        .update({
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

async function coverForEvent(
  event: NormalizedScrapedEvent,
  _venueId: string | null,
): Promise<string> {
  // Scraped events always require AI graphics — never persist third-party photos.
  // Cover factory uses `sharp` (Node-only); Edge cron uses SportSync plates.
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
        await supabase
          .from('events')
          .update({ scraped_at: new Date().toISOString() })
          .eq('id', existing.id);
        stats.unchanged += 1;
        continue;
      }
    }

    const cover = existing?.cover_url
      ? String(existing.cover_url)
      : await coverForEvent(event, venueId);

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
      // Recompute cover only when title/sport/venue changed (identity of SportAvatar)
      const identityChanged =
        !strEq(existing.title, event.title) ||
        !strEq(existing.sport, event.sport) ||
        !strEq(existing.venue_id, venueId);
      if (identityChanged || !existing.cover_url) {
        row.cover_url = await coverForEvent(event, venueId);
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
        await supabase
          .from('tournaments')
          .update({ scraped_at: new Date().toISOString() })
          .eq('id', existing.id);
        stats.unchanged += 1;
        continue;
      }
    }

    const cover =
      existing?.cover_url &&
      strEq(existing.name, item.title) &&
      strEq(existing.sport, item.sport) &&
      strEq(existing.venue_id, venueId)
        ? String(existing.cover_url)
        : await coverForEvent(item, venueId);

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

async function runScrapersSequentially(): Promise<AdapterResult[]> {
  const results: AdapterResult[] = [];
  for (const scrape of NAMED_SCRAPERS) {
    results.push(await scrape.run());
  }
  return results;
}

export async function runAllScrapers(): Promise<ScrapeRunReport> {
  const results = await runScrapersSequentially();
  return persistAdapterResults(results);
}

export interface RunScraperReport extends ScrapeRunReport {
  urls: number;
  dryRun: boolean;
}

/**
 * Scrape a list of venue website URLs sequentially.
 * `dryRun = false` persists into events/tournaments (midnight cron).
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
    const specialized = specializedAdapterForUrl(url);
    if (specialized) {
      if (ranAdapters.has(specialized.id)) continue;
      ranAdapters.add(specialized.id);
      try {
        results.push(await specialized.run());
      } catch (error) {
        results.push({
          source: specialized.id,
          events: [],
          error: error instanceof Error ? error.message : String(error),
        });
      }
      continue;
    }

    const venue = venueByHost.get(hostnameOf(url) ?? '') ?? null;
    const sport = venue?.sports[0] ?? 'OTHER';
    try {
      results.push(
        await scrapeTextListing({
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
      results.push({
        source: 'venue-web',
        events: [],
        error: error instanceof Error ? error.message : String(error),
      });
    }
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
