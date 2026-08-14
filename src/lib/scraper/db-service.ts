import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { detectEventSport } from '@/lib/constants/sports';
import { resolveSportType, buildThemeConfig } from '@/lib/ai/theme-config';
import { prisma } from '@/lib/prisma';
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

/**
 * Stable external id within gemini-web for @@unique([source, externalId]).
 * Unique criterion: originalUrl + startTime (ISO).
 */
export function buildExternalId(
  event: ScrapedEvent,
  opts: { forceGroupClass?: boolean; scrapePageUrl?: string } = {},
): string {
  const startsAt = new Date(event.startTime);
  const startIso = Number.isNaN(startsAt.getTime())
    ? event.startTime
    : startsAt.toISOString();
  const raw = `${canonicalizeSourceUrl(event.originalUrl)}|${startIso}`;
  const hash = createHash('sha1').update(raw).digest('hex').slice(0, 40);
  const pageUrl = opts.scrapePageUrl ?? event.originalUrl;
  const fromSchedulePage =
    opts.forceGroupClass ||
    /\/(rozvrh|schedule|calendar|kalendar|treningy?|tréningy?|lekcie?|classes?)(\/|$|\?)/i.test(
      pageUrl,
    );
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

function looksLikeTournament(event: ScrapedEvent): boolean {
  if (event.isTournament) return true;
  return /\b(turnaj|tournament|\bcup\b|championship|trophy|s[uú]ťaž|sutaz|kvalifik[aá]c)/i.test(
    `${event.title} ${event.description ?? ''}`,
  );
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
  if (looksLikeTournament(event)) return false;
  if (opts.forceGroupClass) return true;
  const pageUrl = opts.scrapePageUrl ?? event.originalUrl;
  return /\/(rozvrh|schedule|calendar|kalendar|treningy?|tréningy?|lekcie?|classes?)(\/|$|\?)/i.test(
    pageUrl,
  );
}

async function findEventByUrlAndStart(originalUrl: string, startsAt: Date) {
  const windowMs = 60_000;
  const from = new Date(startsAt.getTime() - windowMs);
  const to = new Date(startsAt.getTime() + windowMs);
  return prisma.event.findFirst({
    where: {
      sourceUrl: originalUrl,
      startsAt: { gte: from, lte: to },
    },
    select: {
      id: true,
      title: true,
      sport: true,
      startsAt: true,
      priceCents: true,
      sourceUrl: true,
      venueId: true,
      latitude: true,
      longitude: true,
      coverUrl: true,
      externalId: true,
    },
  });
}

async function findTournamentByUrlAndStart(originalUrl: string, startsAt: Date) {
  const windowMs = 60_000;
  const from = new Date(startsAt.getTime() - windowMs);
  const to = new Date(startsAt.getTime() + windowMs);
  return prisma.tournament.findFirst({
    where: {
      sourceUrl: originalUrl,
      startsAt: { gte: from, lte: to },
    },
    select: {
      id: true,
      name: true,
      sport: true,
      startsAt: true,
      entryFee: true,
      sourceUrl: true,
      venueId: true,
      latitude: true,
      longitude: true,
      externalId: true,
    },
  });
}

async function upsertEvent(
  event: ScrapedEvent,
  opts: UpsertScrapedOptions = {},
): Promise<'created' | 'updated' | 'unchanged' | 'skipped'> {
  const startsAt = new Date(event.startTime);
  if (Number.isNaN(startsAt.getTime())) return 'skipped';

  const originalUrl = canonicalizeSourceUrl(event.originalUrl);
  const endTime = event.endTime ? new Date(event.endTime) : null;
  const asGroupClass = isGroupClassWrite(event, opts);
  const externalId = buildExternalId({ ...event, originalUrl }, opts);
  const sport = detectEventSport(`${event.sportType} ${event.title}`);
  const sportType = resolveSportType(sport);
  const priceCents = parsePriceCents(event.priceText);
  const description = withNotice(event.description, originalUrl, asGroupClass);
  const themeConfig = buildThemeConfig(sportType, null);
  const endAt =
    endTime && !Number.isNaN(endTime.getTime()) ? endTime : null;
  const price = new Prisma.Decimal(priceCents / 100);

  const byKey = await prisma.event.findUnique({
    where: {
      source_externalId: { source: GEMINI_SCRAPER_SOURCE, externalId },
    },
    select: {
      id: true,
      title: true,
      sport: true,
      startsAt: true,
      priceCents: true,
      sourceUrl: true,
      venueId: true,
      latitude: true,
      longitude: true,
      coverUrl: true,
      externalId: true,
    },
  });
  const byUrlTime = byKey ? null : await findEventByUrlAndStart(originalUrl, startsAt);
  const existing = byKey ?? byUrlTime;

  const venueId = opts.venueId ?? existing?.venueId ?? null;
  const latitude = opts.latitude ?? existing?.latitude ?? 48.1486;
  const longitude = opts.longitude ?? existing?.longitude ?? 17.1077;

  const shared = {
    type: 'official',
    status: 'open',
    sport,
    sportType,
    title: event.title.slice(0, 200),
    description,
    city: 'Bratislava',
    priceCents,
    currency: 'EUR',
    price,
    eventDate: startsAt,
    startTime: startsAt,
    endTime: endAt,
    startsAt,
    themeConfig: themeConfig as unknown as Prisma.InputJsonValue,
    source: GEMINI_SCRAPER_SOURCE,
    externalId,
    sourceUrl: originalUrl,
    sourceName: 'Web (Gemini)',
    ticketUrl: originalUrl,
    scrapedAt: new Date(),
    isAggregated: true,
    participationMode: 'participate',
    aiEnriched: false,
    venueId,
    latitude,
    longitude,
  };

  if (existing) {
    const unchanged =
      strEq(existing.title, shared.title) &&
      strEq(existing.sport, shared.sport) &&
      existing.startsAt.getTime() === startsAt.getTime() &&
      Number(existing.priceCents ?? 0) === priceCents &&
      strEq(existing.sourceUrl, originalUrl) &&
      strEq(existing.venueId, venueId);

    if (unchanged) {
      await prisma.event.update({
        where: { id: existing.id },
        data: { scrapedAt: new Date(), externalId, source: GEMINI_SCRAPER_SOURCE },
      });
      return 'unchanged';
    }

    await prisma.event.update({
      where: { id: existing.id },
      data: shared,
    });
    return 'updated';
  }

  await prisma.event.upsert({
    where: {
      source_externalId: { source: GEMINI_SCRAPER_SOURCE, externalId },
    },
    create: {
      ...shared,
      photos: [],
      sponsorsJson: [],
    },
    update: shared,
  });
  return 'created';
}

async function upsertTournament(
  event: ScrapedEvent,
  opts: UpsertScrapedOptions = {},
): Promise<'created' | 'updated' | 'unchanged' | 'skipped'> {
  const startsAt = new Date(event.startTime);
  if (Number.isNaN(startsAt.getTime())) return 'skipped';

  const originalUrl = canonicalizeSourceUrl(event.originalUrl);
  const endsAt = event.endTime ? new Date(event.endTime) : null;
  const endsAtValue = endsAt && !Number.isNaN(endsAt.getTime()) ? endsAt : null;
  const nowMs = Date.now();
  if (endsAtValue ? endsAtValue.getTime() < nowMs : startsAt.getTime() < nowMs) {
    return 'skipped';
  }

  const externalId = buildExternalId(
    { ...event, originalUrl },
    { ...opts, forceGroupClass: false },
  );
  const sport = detectEventSport(`${event.sportType} ${event.title}`);
  const entryFee = new Prisma.Decimal(parsePriceCents(event.priceText) / 100);
  const description = withNotice(event.description, originalUrl, false);

  const byKey = await prisma.tournament.findUnique({
    where: {
      source_externalId: { source: GEMINI_SCRAPER_SOURCE, externalId },
    },
    select: {
      id: true,
      name: true,
      sport: true,
      startsAt: true,
      entryFee: true,
      sourceUrl: true,
      venueId: true,
      latitude: true,
      longitude: true,
      externalId: true,
    },
  });
  const byUrlTime = byKey
    ? null
    : await findTournamentByUrlAndStart(originalUrl, startsAt);
  const existing = byKey ?? byUrlTime;

  const venueId = opts.venueId ?? existing?.venueId ?? null;
  const latitude = opts.latitude ?? existing?.latitude ?? null;
  const longitude = opts.longitude ?? existing?.longitude ?? null;

  const shared = {
    name: event.title.slice(0, 200),
    description,
    sport,
    status: 'REGISTRATION_OPEN' as const,
    entryFee,
    maxParticipants: 32,
    city: 'Bratislava',
    startsAt,
    endsAt: endsAtValue,
    source: GEMINI_SCRAPER_SOURCE,
    externalId,
    sourceUrl: originalUrl,
    ticketUrl: originalUrl,
    scrapedAt: new Date(),
    venueId,
    latitude,
    longitude,
  };

  if (existing) {
    const unchanged =
      strEq(existing.name, shared.name) &&
      strEq(existing.sport, shared.sport) &&
      existing.startsAt.getTime() === startsAt.getTime() &&
      Number(existing.entryFee ?? 0) === Number(entryFee) &&
      strEq(existing.sourceUrl, originalUrl) &&
      strEq(existing.venueId, venueId);

    if (unchanged) {
      await prisma.tournament.update({
        where: { id: existing.id },
        data: { scrapedAt: new Date(), externalId, source: GEMINI_SCRAPER_SOURCE },
      });
      return 'unchanged';
    }

    await prisma.tournament.update({
      where: { id: existing.id },
      data: shared,
    });
    return 'updated';
  }

  await prisma.tournament.upsert({
    where: {
      source_externalId: { source: GEMINI_SCRAPER_SOURCE, externalId },
    },
    create: shared,
    update: shared,
  });
  return 'created';
}

/**
 * Idempotent Prisma upsert. Unique criterion: originalUrl + startTime
 * (encoded as gemini-web `externalId`). Re-scrapes refresh price/description.
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
    const key = `${canonicalizeSourceUrl(event.originalUrl)}|${startsAt.toISOString()}`;
    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, event);
      continue;
    }
    // Same url+time: keep richer price/description
    if (!prev.priceText && event.priceText) seen.set(key, event);
    else if (!prev.description && event.description) seen.set(key, event);
  }

  for (const event of seen.values()) {
    try {
      const asTournament = looksLikeTournament(event);
      const result = asTournament
        ? await upsertTournament(event, opts)
        : await upsertEvent(event, opts);
      stats[result] += 1;
      if (asTournament) {
        if (result === 'created') stats.tournamentsCreated += 1;
        else if (result === 'updated') stats.tournamentsUpdated += 1;
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
