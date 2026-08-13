import { createHash } from 'crypto';
import { detectEventSport } from '@/lib/constants/sports';
import { eventIdentityKey } from '@/lib/events/event-identity';
import { resolveSportType, buildThemeConfig } from '@/lib/ai/theme-config';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  GEMINI_SCRAPER_SOURCE,
  type ScrapedEvent,
  type ScraperUpsertStats,
} from './types';

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

/** Stable external id within gemini-web source for @@unique([source, externalId]). */
export function buildExternalId(
  event: ScrapedEvent,
  opts: { forceGroupClass?: boolean; scrapePageUrl?: string } = {},
): string {
  const minute = event.startTime.slice(0, 16);
  const raw = `${event.originalUrl}|${event.title.trim().toLowerCase()}|${minute}`;
  const hash = createHash('sha1').update(raw).digest('hex').slice(0, 40);
  const pageUrl = opts.scrapePageUrl ?? event.originalUrl;
  const fromSchedulePage =
    opts.forceGroupClass ||
    /\/(rozvrh|schedule|calendar|kalendar|treningy?|tréningy?|lekcie?|classes?)(\/|$|\?)/i.test(
      pageUrl,
    );
  // Weekly schedule / studio class slots → feed "Rozpisy & Lekcie"
  if (fromSchedulePage && !event.isTournament) {
    return `class-${hash}`;
  }
  return hash;
}

function withNotice(
  description: string | null | undefined,
  sourceUrl: string,
  asGroupClass: boolean,
): string {
  const classLead = asGroupClass ? 'Skupinové cvičenie na športovisku. ' : '';
  const base = `${classLead}${(description ?? '').trim()}`.trim();
  const notice = `${AGGREGATOR_NOTICE} ${sourceUrl}`.trim();
  if (!base) return notice.slice(0, 600);
  if (base.includes('SportSync zobrazuje textový prehľad')) return base.slice(0, 600);
  return `${base.slice(0, 400)}\n\n${notice}`.slice(0, 600);
}

function strEq(a: unknown, b: unknown): boolean {
  return String(a ?? '') === String(b ?? '');
}

export interface UpsertScrapedOptions {
  venueId?: string;
  latitude?: number | null;
  longitude?: number | null;
  /** True when scraped from a rozvrh/schedule page — store as class-* lessons. */
  forceGroupClass?: boolean;
  /** Canonical scrape page URL (preferred over Gemini's originalUrl for class detection). */
  scrapePageUrl?: string;
}

function isGroupClassWrite(event: ScrapedEvent, opts: UpsertScrapedOptions): boolean {
  if (event.isTournament) return false;
  if (opts.forceGroupClass) return true;
  const pageUrl = opts.scrapePageUrl ?? event.originalUrl;
  return /\/(rozvrh|schedule|calendar|kalendar|treningy?|tréningy?|lekcie?|classes?)(\/|$|\?)/i.test(
    pageUrl,
  );
}

async function findSoftIdentityMatch(
  title: string,
  startsAt: Date,
): Promise<{ id: string } | null> {
  const supabase = createAdminClient();
  const windowMs = 90_000;
  const from = new Date(startsAt.getTime() - windowMs).toISOString();
  const to = new Date(startsAt.getTime() + windowMs).toISOString();

  const { data, error } = await supabase
    .from('events')
    .select('id, title, starts_at')
    .gte('starts_at', from)
    .lte('starts_at', to)
    .neq('status', 'cancelled')
    .limit(25);

  if (error || !data) return null;

  const key = eventIdentityKey(title, startsAt);
  for (const row of data) {
    if (!row.title || !row.starts_at) continue;
    if (eventIdentityKey(String(row.title), new Date(String(row.starts_at))) === key) {
      return { id: String(row.id) };
    }
  }
  return null;
}

async function upsertEvent(
  event: ScrapedEvent,
  opts: UpsertScrapedOptions = {},
): Promise<'created' | 'updated' | 'unchanged' | 'skipped'> {
  const startsAt = new Date(event.startTime);
  if (Number.isNaN(startsAt.getTime())) return 'skipped';

  const supabase = createAdminClient();
  const endTime = event.endTime ? new Date(event.endTime) : null;
  const asGroupClass = isGroupClassWrite(event, opts);
  const externalId = buildExternalId(event, opts);
  const sport = detectEventSport(`${event.sportType} ${event.title}`);
  const sportType = resolveSportType(sport);
  const priceCents = parsePriceCents(event.priceText);
  const description = withNotice(event.description, event.originalUrl, asGroupClass);
  const themeConfig = buildThemeConfig(sportType, null);
  const startsIso = startsAt.toISOString();
  const endIso =
    endTime && !Number.isNaN(endTime.getTime()) ? endTime.toISOString() : null;

  const { data: existing, error: findError } = await supabase
    .from('events')
    .select(
      'id, title, sport, starts_at, price_cents, source_url, venue_id, latitude, longitude, cover_url',
    )
    .eq('source', GEMINI_SCRAPER_SOURCE)
    .eq('external_id', externalId)
    .maybeSingle();

  if (findError) throw new Error(findError.message);

  if (!existing) {
    const soft = await findSoftIdentityMatch(event.title, startsAt);
    if (soft) {
      await supabase
        .from('events')
        .update({
          scraped_at: new Date().toISOString(),
          ...(opts.venueId ? { venue_id: opts.venueId } : {}),
        })
        .eq('id', soft.id);
      return 'unchanged';
    }
  }

  const venueId = opts.venueId ?? existing?.venue_id ?? null;
  const latitude = opts.latitude ?? existing?.latitude ?? 48.1486;
  const longitude = opts.longitude ?? existing?.longitude ?? 17.1077;

  const row = {
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
    event_date: startsIso,
    start_time: startsIso,
    end_time: endIso,
    starts_at: startsIso,
    theme_config: themeConfig,
    source: GEMINI_SCRAPER_SOURCE,
    external_id: externalId,
    source_url: event.originalUrl,
    source_name: 'Web (Gemini)',
    ticket_url: event.originalUrl,
    scraped_at: new Date().toISOString(),
    is_aggregated: true,
    participation_mode: 'participate',
    ai_enriched: false,
    venue_id: venueId,
    latitude,
    longitude,
    photos: [],
    sponsors_json: [],
  };

  if (existing) {
    const unchanged =
      strEq(existing.title, row.title) &&
      strEq(existing.sport, row.sport) &&
      new Date(String(existing.starts_at)).getTime() === startsAt.getTime() &&
      Number(existing.price_cents ?? 0) === priceCents &&
      strEq(existing.source_url, event.originalUrl) &&
      strEq(existing.venue_id, venueId);

    if (unchanged) {
      await supabase
        .from('events')
        .update({ scraped_at: new Date().toISOString() })
        .eq('id', existing.id);
      return 'unchanged';
    }

    const { error } = await supabase.from('events').update(row).eq('id', existing.id);
    if (error) throw new Error(error.message);
    return 'updated';
  }

  const { error } = await supabase.from('events').insert(row);
  if (error) throw new Error(error.message);
  return 'created';
}

async function upsertTournament(
  event: ScrapedEvent,
  opts: UpsertScrapedOptions = {},
): Promise<'created' | 'updated' | 'unchanged' | 'skipped'> {
  const startsAt = new Date(event.startTime);
  if (Number.isNaN(startsAt.getTime())) return 'skipped';

  const supabase = createAdminClient();
  const endsAt = event.endTime ? new Date(event.endTime) : null;
  const externalId = buildExternalId(event, { ...opts, forceGroupClass: false });
  const sport = detectEventSport(`${event.sportType} ${event.title}`);
  const entryFee = parsePriceCents(event.priceText) / 100;
  const description = withNotice(event.description, event.originalUrl, false);
  const startsIso = startsAt.toISOString();
  const endsIso =
    endsAt && !Number.isNaN(endsAt.getTime()) ? endsAt.toISOString() : null;

  const { data: existing, error: findError } = await supabase
    .from('tournaments')
    .select(
      'id, name, sport, starts_at, entry_fee, source_url, venue_id, latitude, longitude',
    )
    .eq('source', GEMINI_SCRAPER_SOURCE)
    .eq('external_id', externalId)
    .maybeSingle();

  if (findError) throw new Error(findError.message);

  const venueId = opts.venueId ?? existing?.venue_id ?? null;
  const latitude = opts.latitude ?? existing?.latitude ?? null;
  const longitude = opts.longitude ?? existing?.longitude ?? null;

  const row = {
    name: event.title.slice(0, 200),
    description,
    sport,
    status: 'REGISTRATION_OPEN',
    entry_fee: entryFee,
    max_participants: 32,
    city: 'Bratislava',
    starts_at: startsIso,
    ends_at: endsIso,
    source: GEMINI_SCRAPER_SOURCE,
    external_id: externalId,
    source_url: event.originalUrl,
    ticket_url: event.originalUrl,
    scraped_at: new Date().toISOString(),
    venue_id: venueId,
    latitude,
    longitude,
  };

  if (existing) {
    const unchanged =
      strEq(existing.name, row.name) &&
      strEq(existing.sport, row.sport) &&
      new Date(String(existing.starts_at)).getTime() === startsAt.getTime() &&
      Number(existing.entry_fee ?? 0) === entryFee &&
      strEq(existing.source_url, event.originalUrl) &&
      strEq(existing.venue_id, venueId);

    if (unchanged) {
      await supabase
        .from('tournaments')
        .update({ scraped_at: new Date().toISOString() })
        .eq('id', existing.id);
      return 'unchanged';
    }

    const { error } = await supabase.from('tournaments').update(row).eq('id', existing.id);
    if (error) throw new Error(error.message);
    return 'updated';
  }

  const { error } = await supabase.from('tournaments').insert(row);
  if (error) throw new Error(error.message);
  return 'created';
}

/**
 * Upsert scraped events/tournaments via Supabase service role.
 * Dedupes on (source, externalId) and soft title+minute identity for events.
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
  };

  const seen = new Map<string, ScrapedEvent>();
  for (const event of events) {
    const startsAt = new Date(event.startTime);
    if (Number.isNaN(startsAt.getTime())) {
      stats.skipped += 1;
      continue;
    }
    const key = eventIdentityKey(event.title, startsAt);
    if (!seen.has(key)) seen.set(key, event);
  }

  for (const event of seen.values()) {
    try {
      const result = event.isTournament
        ? await upsertTournament(event, opts)
        : await upsertEvent(event, opts);
      stats[result] += 1;
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
