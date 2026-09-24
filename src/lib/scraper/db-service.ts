import { createHash } from 'node:crypto';
import { detectEventSport } from '@/lib/constants/sports';
import { resolveSportType, buildThemeConfig } from '@/lib/ai/theme-config';
import { classifyListingAudience } from '@/lib/events/audience';
import { listingIsOutsideBratislava } from '@/lib/cities';
import { createAdminClient } from '@/lib/supabase/admin';
import { type ProgramBucket } from '@/lib/programs/classify';
import {
  GEMINI_SCRAPER_SOURCE,
  type ScrapedEvent,
  type ScraperUpsertStats,
} from './types';
import { toAppDateKey } from '@/lib/datetime/bratislava';
import { dateOnlySortInstant } from './date-only-time';
import {
  looksLikeGroupClassListing,
  recurringNormalizedTitlesFromBatch,
  shouldForceGroupClassFromUrl,
} from '@/lib/feed/group-class';
import { classifyScrapedEventBucket } from '@/lib/scrape/listing-bucket';
import {
  loadVenueUrlIndex,
  findVenueInIndex,
  resolveVenueFromListingUrl,
  resolveVenueFromLocationName,
  type ResolvedListingVenue,
  type VenueUrlIndex,
} from './resolve-venue';
import { resolveParticipationMode } from '@/lib/participation/fixture-match';

const AGGREGATOR_NOTICE =
  'SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora.';

function parsePriceCents(text: string | null | undefined): number {
  if (!text) return 0;
  if (/zadarmo|free|0\s*€/i.test(text)) return 0;
  const m = text.match(/(\d+)(?:[,.](\d{1,2}))?\s*€/);
  if (!m) return 0;
  const euros = Number(m[1]);
  const cents = m[2] ? Number(m[2].padEnd(2, '0').slice(0, 2)) : 0;
  return euros * 100 + cents;
}

export function canonicalizeSourceUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    parsed.hash = '';
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

/** Fold title so parallel classes at the same time stay distinct (Ženy vs Deti o 17:00). */
function titleKey(title: string | null | undefined): string {
  return (title ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Stable external id within gemini-web for @@unique([source, externalId]).
 * Unique criterion: originalUrl + startTime (ISO) + title
 * (schedule pages often list multiple classes at the same clock time).
 */
export function buildExternalId(
  event: ScrapedEvent,
  opts: { forceGroupClass?: boolean; scrapePageUrl?: string } = {},
): string {
  const startsAt = new Date(event.startTime);
  const startKey = Number.isNaN(startsAt.getTime())
    ? event.startTime
    : event.timeKnown === false
      ? toAppDateKey(startsAt)
      : startsAt.toISOString();
  const pageUrl = opts.scrapePageUrl ?? event.originalUrl;
  const fromSchedulePage =
    opts.forceGroupClass ||
    shouldForceGroupClassFromUrl(pageUrl) ||
    looksLikeGroupClassListing({
      title: event.title,
      description: event.description,
      sourceUrl: pageUrl,
      isGroupClass: event.isGroupClass,
    });
  // Hash against the schedule page when this is a group-class write so Gemini
  // detail URLs (/sebaobrana-…) don't create a second identity for the same slot.
  const urlForHash =
    fromSchedulePage && opts.scrapePageUrl
      ? canonicalizeSourceUrl(opts.scrapePageUrl)
      : canonicalizeSourceUrl(event.originalUrl);
  const raw = `${urlForHash}|${startKey}|${titleKey(event.title)}`;
  const hash = createHash('sha1').update(raw).digest('hex').slice(0, 40);
  if (fromSchedulePage && !event.isTournament) {
    return `class-${hash}`;
  }
  return hash;
}

function withNotice(
  description: string | null | undefined,
  sourceUrl: string,
  asGroupClass: boolean,
  ageCategory?: string | null,
): string {
  const classLead = asGroupClass ? 'Skupinové cvičenie na športovisku. ' : '';
  const age =
    ageCategory?.trim() &&
    !(description ?? '').toLowerCase().includes(ageCategory.trim().toLowerCase())
      ? `Vek: ${ageCategory.trim()}. `
      : '';
  const base = `${classLead}${age}${(description ?? '').trim()}`.trim();
  const notice = `${AGGREGATOR_NOTICE} ${sourceUrl}`.trim();
  if (!base) return notice.slice(0, 600);
  if (base.includes('SportSync zobrazuje textový prehľad')) return base.slice(0, 600);
  return `${base.slice(0, 400)}\n\n${notice}`.slice(0, 600);
}

function strEq(a: unknown, b: unknown): boolean {
  return String(a ?? '') === String(b ?? '');
}

function classifyForUpsert(event: ScrapedEvent, opts: UpsertScrapedOptions) {
  return classifyScrapedEventBucket(event, {
    scrapePageUrl: opts.scrapePageUrl,
    scrapePageKind: opts.scrapePageKind,
    forceProgramKind: opts.forceProgramKind,
    forceGroupClass: opts.forceGroupClass,
    recurringTitles: opts.recurringTitles,
  });
}

export interface UpsertScrapedOptions {
  venueId?: string;
  latitude?: number | null;
  longitude?: number | null;
  /** True when scraped from a rozvrh/schedule/program page — store as class-* lessons. */
  forceGroupClass?: boolean;
  /** True when scraped from kids_camps pages — mark listings for_kids. */
  forceForKids?: boolean;
  /** Persist theme_config.programKind (camps / workshops / courses). */
  forceProgramKind?: ProgramBucket | null;
  /** venue_scrape_pages.kind — used when forceProgramKind is not set. */
  scrapePageKind?: string | null;
  /** Canonical scrape page URL (preferred over Gemini's originalUrl for class detection). */
  scrapePageUrl?: string;
  /** Normalized titles that repeat on 2+ days in this scrape batch. */
  recurringTitles?: ReadonlySet<string>;
  /** Preloaded venue URL index — avoids a DB round-trip per event. */
  venueIndex?: VenueUrlIndex;
}

function resolveWriteVenue(
  event: ScrapedEvent,
  opts: UpsertScrapedOptions,
  existingVenueId: string | null,
): { venueId: string | null; named: ResolvedListingVenue | null } {
  const index = opts.venueIndex;
  const pageUrl = opts.scrapePageUrl ?? event.originalUrl;
  const fromUrl = index ? resolveVenueFromListingUrl(pageUrl, index) : null;
  const fromName =
    !fromUrl && index ? resolveVenueFromLocationName(event.locationName, index) : null;
  const resolved = fromUrl ?? fromName;
  const venueId = opts.venueId ?? resolved?.id ?? existingVenueId ?? null;
  const named =
    (resolved && resolved.id === venueId ? resolved : null) ??
    (venueId && index ? findVenueInIndex(venueId, index) : null);
  return { venueId, named };
}

type ExistingEvent = {
  id: string;
  title: string;
  sport: string;
  starts_at: string;
  price_cents: number | null;
  source_url: string | null;
  venue_id: string | null;
  latitude: number | null;
  longitude: number | null;
  cover_url: string | null;
  external_id: string | null;
  for_kids: boolean | null;
  for_women: boolean | null;
};

type ExistingTournament = {
  id: string;
  name: string;
  sport: string;
  starts_at: string;
  entry_fee: number | string | null;
  source_url: string | null;
  venue_id: string | null;
  latitude: number | null;
  longitude: number | null;
  external_id: string | null;
  for_kids: boolean | null;
  for_women: boolean | null;
};

async function findEventByUrlAndStart(
  originalUrl: string,
  startsAt: Date,
  title: string,
) {
  const supabase = createAdminClient();
  const from = new Date(startsAt.getTime() - 60_000).toISOString();
  const to = new Date(startsAt.getTime() + 60_000).toISOString();
  const want = titleKey(title);
  const { data } = await supabase
    .from('events')
    .select(
      'id, title, sport, starts_at, price_cents, source_url, venue_id, latitude, longitude, cover_url, external_id, for_kids, for_women',
    )
    .eq('source_url', originalUrl)
    .gte('starts_at', from)
    .lte('starts_at', to)
    .limit(20);
  const rows = (data ?? []) as ExistingEvent[];
  if (!want) return rows[0] ?? null;
  return rows.find((row) => titleKey(row.title) === want) ?? null;
}

async function findTournamentByUrlAndStart(
  originalUrl: string,
  startsAt: Date,
  title: string,
) {
  const supabase = createAdminClient();
  const from = new Date(startsAt.getTime() - 60_000).toISOString();
  const to = new Date(startsAt.getTime() + 60_000).toISOString();
  const want = titleKey(title);
  const { data } = await supabase
    .from('tournaments')
    .select(
      'id, name, sport, starts_at, entry_fee, source_url, venue_id, latitude, longitude, external_id, for_kids, for_women',
    )
    .eq('source_url', originalUrl)
    .gte('starts_at', from)
    .lte('starts_at', to)
    .limit(20);
  const rows = (data ?? []) as ExistingTournament[];
  if (!want) return rows[0] ?? null;
  return rows.find((row) => titleKey(row.name) === want) ?? null;
}

async function upsertEvent(
  event: ScrapedEvent,
  opts: UpsertScrapedOptions = {},
): Promise<'created' | 'updated' | 'unchanged' | 'skipped'> {
  const timeKnown = event.timeKnown !== false;
  let startsAt = new Date(event.startTime);
  if (Number.isNaN(startsAt.getTime())) return 'skipped';
  if (!timeKnown) {
    startsAt = dateOnlySortInstant(event.startTime);
    if (Number.isNaN(startsAt.getTime())) return 'skipped';
  }

  const supabase = createAdminClient();
  const geminiUrl = canonicalizeSourceUrl(event.originalUrl);
  const classified = classifyForUpsert(event, opts);
  if (classified.bucket === 'skip' || classified.bucket === 'tournament') {
    return 'skipped';
  }
  const asGroupClass = classified.bucket === 'group_class';
  const programKind = classified.programKind;
  const scheduleUrl =
    asGroupClass && opts.scrapePageUrl
      ? canonicalizeSourceUrl(opts.scrapePageUrl)
      : null;
  const sourceUrl = scheduleUrl ?? geminiUrl;
  const ticketUrl =
    scheduleUrl && geminiUrl !== scheduleUrl ? geminiUrl : sourceUrl;
  const externalId = buildExternalId(
    { ...event, originalUrl: sourceUrl, timeKnown, startTime: startsAt.toISOString() },
    { ...opts, forceGroupClass: asGroupClass || opts.forceGroupClass },
  );
  const sport = detectEventSport(`${event.sportType} ${event.title}`);
  const sportType = resolveSportType(sport);
  const priceCents = parsePriceCents(event.priceText);
  const description = withNotice(
    event.description,
    sourceUrl,
    asGroupClass,
    event.ageCategory,
  );
  const themeConfig = {
    ...buildThemeConfig(sportType, null),
    ...(programKind ? { programKind } : {}),
  };
  const startsAtIso = startsAt.toISOString();
  // Persist end for timed windows and date-only multi-day festivals (5.–9. nov).
  let endAtIso: string | null = null;
  if (event.endTime) {
    if (timeKnown) {
      const endTime = new Date(event.endTime);
      if (!Number.isNaN(endTime.getTime())) endAtIso = endTime.toISOString();
    } else {
      const endNoon = dateOnlySortInstant(event.endTime);
      if (
        !Number.isNaN(endNoon.getTime()) &&
        toAppDateKey(endNoon) > toAppDateKey(startsAt)
      ) {
        endAtIso = endNoon.toISOString();
      }
    }
  }

  const { data: byKey } = await supabase
    .from('events')
    .select(
      'id, title, sport, starts_at, price_cents, source_url, venue_id, latitude, longitude, cover_url, external_id, for_kids, for_women',
    )
    .eq('source', GEMINI_SCRAPER_SOURCE)
    .eq('external_id', externalId)
    .maybeSingle();

  const existing =
    (byKey as ExistingEvent | null) ??
    (await findEventByUrlAndStart(sourceUrl, startsAt, event.title)) ??
    (geminiUrl !== sourceUrl
      ? await findEventByUrlAndStart(geminiUrl, startsAt, event.title)
      : null);

  const { venueId, named } = resolveWriteVenue(event, opts, existing?.venue_id ?? null);
  const latitude =
    opts.latitude ?? named?.latitude ?? existing?.latitude ?? 48.1486;
  const longitude =
    opts.longitude ?? named?.longitude ?? existing?.longitude ?? 17.1077;
  const sourceName = named?.name?.trim() || 'Web športoviska';
  const { forKids, forWomen } = classifyListingAudience({
    title: event.title,
    description: event.description,
    sourceUrl,
    venueName: sourceName,
    locationName: event.locationName,
    forKids: opts.forceForKids || event.isForKids,
    forWomen: event.isForWomenOnly,
  });

  const shared = {
    type: 'official',
    status: 'open',
    sport,
    sport_type: sportType,
    title: event.title.slice(0, 200),
    description,
    city: 'Bratislava',
    price_cents: priceCents,
    currency: 'EUR',
    price: priceCents / 100,
    event_date: startsAtIso,
    // null = date known, clock unknown — UI must not show a fake HH:MM
    start_time: timeKnown ? startsAtIso : null,
    end_time: endAtIso,
    starts_at: startsAtIso,
    theme_config: themeConfig,
    source: GEMINI_SCRAPER_SOURCE,
    external_id: externalId,
    source_url: sourceUrl,
    source_name: sourceName,
    ticket_url: ticketUrl,
    scraped_at: new Date().toISOString(),
    is_aggregated: true,
    participation_mode: resolveParticipationMode({
      title: event.title,
      description: event.description,
      sourceUrl,
      ticketUrl,
      source: GEMINI_SCRAPER_SOURCE,
    }),
    ai_enriched: false,
    venue_id: venueId,
    latitude,
    longitude,
    for_kids: forKids,
    for_women: forWomen,
    source_excerpt: event.sourceExcerpt?.slice(0, 500) ?? null,
    source_evidence: event.sourceEvidence ?? null,
  };

  if (existing) {
    const unchanged =
      strEq(existing.title, shared.title) &&
      strEq(existing.sport, shared.sport) &&
      new Date(existing.starts_at).getTime() === startsAt.getTime() &&
      Number(existing.price_cents ?? 0) === priceCents &&
      strEq(existing.source_url, sourceUrl) &&
      strEq(existing.venue_id, venueId) &&
      Boolean(existing.for_kids) === forKids &&
      Boolean(existing.for_women) === forWomen;

    if (unchanged) {
      // Always refresh provenance + clock-known flag even when identity is unchanged
      await supabase
        .from('events')
        .update({
          scraped_at: new Date().toISOString(),
          external_id: externalId,
          source: GEMINI_SCRAPER_SOURCE,
          source_excerpt: shared.source_excerpt,
          source_evidence: shared.source_evidence,
          start_time: shared.start_time,
          end_time: shared.end_time,
          starts_at: shared.starts_at,
          event_date: shared.event_date,
        })
        .eq('id', existing.id);
      return 'unchanged';
    }

    const { error } = await supabase.from('events').update(shared).eq('id', existing.id);
    if (error) {
      console.warn('[scraper.db] event update failed', event.title, error.message);
      return 'skipped';
    }
    return 'updated';
  }

  const { error } = await supabase.from('events').insert({
    ...shared,
    photos: [],
    sponsors_json: [],
  });
  if (error) {
    console.warn('[scraper.db] event insert failed', event.title, error.message);
    return 'skipped';
  }
  return 'created';
}

async function upsertTournament(
  event: ScrapedEvent,
  opts: UpsertScrapedOptions = {},
): Promise<'created' | 'updated' | 'unchanged' | 'skipped'> {
  const startsAt = new Date(event.startTime);
  if (Number.isNaN(startsAt.getTime())) return 'skipped';

  const supabase = createAdminClient();
  const originalUrl = canonicalizeSourceUrl(event.originalUrl);
  const endsAt = event.endTime ? new Date(event.endTime) : null;
  const endsAtIso = endsAt && !Number.isNaN(endsAt.getTime()) ? endsAt.toISOString() : null;
  const nowMs = Date.now();
  if (endsAtIso ? new Date(endsAtIso).getTime() < nowMs : startsAt.getTime() < nowMs) {
    return 'skipped';
  }

  const externalId = buildExternalId(
    { ...event, originalUrl },
    { ...opts, forceGroupClass: false },
  );
  const sport = detectEventSport(`${event.sportType} ${event.title}`);
  const entryFee = parsePriceCents(event.priceText) / 100;
  const description = withNotice(
    event.description,
    originalUrl,
    false,
    event.ageCategory,
  );
  const startsAtIso = startsAt.toISOString();

  const { data: byKey } = await supabase
    .from('tournaments')
    .select(
      'id, name, sport, starts_at, entry_fee, source_url, venue_id, latitude, longitude, external_id, for_kids, for_women',
    )
    .eq('source', GEMINI_SCRAPER_SOURCE)
    .eq('external_id', externalId)
    .maybeSingle();

  const existing =
    (byKey as ExistingTournament | null) ??
    (await findTournamentByUrlAndStart(originalUrl, startsAt, event.title));

  const { venueId, named } = resolveWriteVenue(event, opts, existing?.venue_id ?? null);
  const latitude = opts.latitude ?? named?.latitude ?? existing?.latitude ?? 48.1486;
  const longitude = opts.longitude ?? named?.longitude ?? existing?.longitude ?? 17.1077;
  const sourceName = named?.name?.trim() || 'Web športoviska';
  const { forKids, forWomen } = classifyListingAudience({
    title: event.title,
    description: event.description,
    sourceUrl: originalUrl,
    venueName: sourceName,
    locationName: event.locationName,
    forKids: opts.forceForKids || event.isForKids,
    forWomen: event.isForWomenOnly,
  });

  const shared = {
    name: event.title.slice(0, 200),
    description,
    sport,
    status: 'REGISTRATION_OPEN' as const,
    format: 'SINGLE_ELIMINATION',
    entry_fee: entryFee,
    max_participants: 32,
    city: 'Bratislava',
    starts_at: startsAtIso,
    ends_at: endsAtIso,
    registration_deadline: startsAtIso,
    source: GEMINI_SCRAPER_SOURCE,
    external_id: externalId,
    source_url: originalUrl,
    ticket_url: originalUrl,
    scraped_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    venue_id: venueId,
    latitude,
    longitude,
    for_kids: forKids,
    for_women: forWomen,
  };

  if (existing) {
    const unchanged =
      strEq(existing.name, shared.name) &&
      strEq(existing.sport, shared.sport) &&
      new Date(existing.starts_at).getTime() === startsAt.getTime() &&
      Number(existing.entry_fee ?? 0) === entryFee &&
      strEq(existing.source_url, originalUrl) &&
      strEq(existing.venue_id, venueId) &&
      Boolean(existing.for_kids) === forKids &&
      Boolean(existing.for_women) === forWomen;

    if (unchanged) {
      await supabase
        .from('tournaments')
        .update({
          scraped_at: new Date().toISOString(),
          external_id: externalId,
          source: GEMINI_SCRAPER_SOURCE,
        })
        .eq('id', existing.id);
      return 'unchanged';
    }

    const { error } = await supabase
      .from('tournaments')
      .update(shared)
      .eq('id', existing.id);
    if (error) {
      console.warn('[scraper.db] tournament update failed', event.title, error.message);
      return 'skipped';
    }
    return 'updated';
  }

  const { error } = await supabase.from('tournaments').insert(shared);
  if (error) {
    console.warn('[scraper.db] tournament insert failed', event.title, error.message);
    return 'skipped';
  }
  return 'created';
}

/**
 * Idempotent upsert via Supabase service-role REST (avoids Prisma DATABASE_URL / IPv6).
 * Unique criterion: originalUrl + startTime + title (encoded as gemini-web `externalId`).
 */
export async function upsertScrapedEvents(
  events: ScrapedEvent[],
  opts: UpsertScrapedOptions = {},
): Promise<ScraperUpsertStats> {
  const stats: ScraperUpsertStats = {
    created: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    groupClassesCreated: 0,
    specialEventsCreated: 0,
    tournamentsCreated: 0,
    tournamentsUpdated: 0,
  };

  const seen = new Map<string, ScrapedEvent>();
  for (const event of events) {
    const startsAt = new Date(event.startTime);
    if (Number.isNaN(startsAt.getTime())) {
      stats.skipped += 1;
      continue;
    }
    // Include title — same-slot parallel classes (ŽENY vs Deti) must not collapse.
    const key = `${canonicalizeSourceUrl(event.originalUrl)}|${startsAt.toISOString()}|${titleKey(event.title)}`;
    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, event);
      continue;
    }
    // Prefer the women/kids-tagged variant when titles collide after folding.
    const prefer =
      (!prev.isForWomenOnly && event.isForWomenOnly) ||
      (!prev.isForKids && event.isForKids) ||
      (!prev.priceText && event.priceText) ||
      (!prev.description && event.description);
    if (prefer) seen.set(key, event);
  }

  const uniqueEvents = [...seen.values()];
  const recurringTitles = recurringNormalizedTitlesFromBatch(
    uniqueEvents.map((event) => ({ title: event.title, startTime: event.startTime })),
    (startsAt) => toAppDateKey(startsAt instanceof Date ? startsAt : new Date(startsAt)),
  );
  const venueIndex = opts.venueIndex ?? (await loadVenueUrlIndex());
  const writeOpts: UpsertScrapedOptions = { ...opts, recurringTitles, venueIndex };

  for (const event of uniqueEvents) {
    try {
      if (
        listingIsOutsideBratislava(
          event.title,
          event.city,
          event.locationName,
          event.description,
        )
      ) {
        stats.skipped += 1;
        console.log(
          `[scraper.db] skip outside Bratislava: ${event.title}` +
            (event.city ? ` (${event.city})` : ''),
        );
        continue;
      }

      const classified = classifyForUpsert(event, writeOpts);
      if (classified.bucket === 'skip') {
        stats.skipped += 1;
        console.log(`[scraper.db] skip ${classified.reason}: ${event.title}`);
        continue;
      }

      if (classified.bucket === 'tournament') {
        const result = await upsertTournament(event, writeOpts);
        stats[result] += 1;
        if (result === 'created') stats.tournamentsCreated += 1;
        else if (result === 'updated') stats.tournamentsUpdated += 1;
        continue;
      }

      const eventOpts: UpsertScrapedOptions = {
        ...writeOpts,
        forceGroupClass: classified.bucket === 'group_class',
        forceProgramKind: classified.programKind ?? writeOpts.forceProgramKind,
      };
      const result = await upsertEvent(event, eventOpts);
      stats[result] += 1;
      if (result === 'created') {
        if (classified.bucket === 'group_class') stats.groupClassesCreated += 1;
        else if (classified.bucket === 'event') stats.specialEventsCreated += 1;
      }
    } catch (err) {
      stats.skipped += 1;
      console.warn(
        '[scraper.db] upsert failed',
        event.title,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return stats;
}

/**
 * Bind scraped listings to a venue and upsert idempotently.
 * Unique key: originalUrl + startTime + title (encoded as gemini-web externalId).
 */
export async function saveEventsForVenue(
  events: ScrapedEvent[],
  venueId: string,
  opts: Omit<UpsertScrapedOptions, 'venueId'> = {},
): Promise<ScraperUpsertStats> {
  if (!venueId?.trim()) {
    throw new Error('saveEventsForVenue requires a non-empty venueId');
  }
  return upsertScrapedEvents(events, { ...opts, venueId: venueId.trim() });
}
