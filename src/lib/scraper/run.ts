import { SCRAPE_TARGETS } from '@/lib/scrape/sources';
import { SCRAPING_SOURCES } from '@/lib/scrape/scraping-sources';
import { extractEventsFromText } from './extractor';
import { fetchCleanText, sleep, HOST_DELAY_MS, withUrlProcessingTimeout } from './fetcher';
import { upsertScrapedEvents, type UpsertScrapedOptions } from './db-service';
import { purgePastListings } from './purge';
import type {
  MidnightSyncReport,
  ScrapedEvent,
  ScraperRunReport,
  ScraperUpsertStats,
  ScraperUrlResult,
} from './types';
import { shouldForceGroupClassFromUrl } from '@/lib/feed/group-class';
import {
  recordUrlResult,
  shouldSkipUrl,
} from '@/lib/scrape/source-health';

export interface VenueScrapeTarget {
  url: string;
  venueId?: string;
  latitude?: number | null;
  longitude?: number | null;
  forceGroupClass?: boolean;
}

export interface RunScraperOptions {
  /** Target pages. Defaults to Venue.websiteUrl (+ enabled scrape pages). */
  urls?: string[];
  targets?: VenueScrapeTarget[];
  /** When true, extract + log only — no Prisma writes. */
  dryRun?: boolean;
  /** Max URLs to process in one run (Vercel 300s / politeness guard). */
  limit?: number;
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === '') return fallback;
  return /^(1|true|yes|on)$/i.test(value);
}

function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function randomPauseMs(): number {
  return (
    HOST_DELAY_MS.min +
    Math.floor(Math.random() * (HOST_DELAY_MS.max - HOST_DELAY_MS.min + 1))
  );
}

function emptyUpsert(): ScraperUpsertStats {
  return {
    created: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    tournamentsCreated: 0,
    tournamentsUpdated: 0,
  };
}

function addStats(a: ScraperUpsertStats, b: ScraperUpsertStats): ScraperUpsertStats {
  return {
    created: a.created + b.created,
    updated: a.updated + b.updated,
    unchanged: a.unchanged + b.unchanged,
    skipped: a.skipped + b.skipped,
    tournamentsCreated: a.tournamentsCreated + b.tournamentsCreated,
    tournamentsUpdated: a.tournamentsUpdated + b.tournamentsUpdated,
  };
}

/**
 * Load every venue with a valid websiteUrl, plus enabled VenueScrapePage URLs
 * for discovery (rozvrh / turnaje). Deduped, sequential-friendly.
 */
export async function loadVenueWebsiteTargets(): Promise<VenueScrapeTarget[]> {
  const { prisma } = await import('@/lib/prisma');
  const venues = await prisma.venue.findMany({
    where: { websiteUrl: { not: null } },
    select: {
      id: true,
      websiteUrl: true,
      latitude: true,
      longitude: true,
      scrapePages: {
        where: { enabled: true },
        select: { url: true, kind: true },
      },
    },
  });

  const seen = new Set<string>();
  const out: VenueScrapeTarget[] = [];

  const push = (
    url: string | null | undefined,
    venue: (typeof venues)[number],
    forceGroupClass = false,
  ) => {
    const trimmed = url?.trim();
    if (!trimmed || seen.has(trimmed) || !isHttpUrl(trimmed)) return;
    seen.add(trimmed);
    out.push({
      url: trimmed,
      venueId: venue.id,
      latitude: venue.latitude,
      longitude: venue.longitude,
      forceGroupClass,
    });
  };

  for (const venue of venues) {
    push(venue.websiteUrl, venue);
    for (const page of venue.scrapePages) {
      const kind = page.kind.toLowerCase();
      const forceGroupClass =
        kind === 'schedule' ||
        kind === 'rozvrh' ||
        kind === 'classes' ||
        (kind !== 'tournaments' && shouldForceGroupClassFromUrl(page.url));
      push(page.url, venue, forceGroupClass);
    }
  }

  return out;
}

function joinUrl(base: string, path: string): string {
  const root = base.endsWith('/') ? base : `${base}/`;
  return new URL(path.replace(/^\//, ''), root).toString();
}

/** Static registry fallback when the DB has no venue websites yet. */
function staticScrapeTargets(): VenueScrapeTarget[] {
  const seen = new Set<string>();
  const out: VenueScrapeTarget[] = [];
  const push = (url: string | undefined) => {
    const trimmed = url?.trim();
    if (!trimmed || seen.has(trimmed) || !isHttpUrl(trimmed)) return;
    seen.add(trimmed);
    out.push({ url: trimmed });
  };
  for (const target of SCRAPE_TARGETS) {
    push(target.url);
    for (const path of target.paths ?? []) {
      try {
        push(joinUrl(target.url, path));
      } catch {
        // ignore bad relative paths
      }
    }
  }
  for (const source of SCRAPING_SOURCES) {
    push(source.url);
  }
  return out;
}

async function resolveTargets(options: RunScraperOptions): Promise<VenueScrapeTarget[]> {
  if (options.targets?.length) return options.targets;
  if (options.urls?.length) {
    return options.urls.filter(isHttpUrl).map((url) => ({ url }));
  }
  const fromDb = await loadVenueWebsiteTargets();
  return fromDb.length > 0 ? fromDb : staticScrapeTargets();
}

/**
 * Walk venue websites: fetch clean text → Gemini 2.0 Flash extract → Prisma upsert.
 * Between URLs: randomized 3–5s pause. Failures on one URL do not abort the run.
 */
export async function runGeminiScraper(
  options: RunScraperOptions = {},
): Promise<ScraperRunReport> {
  const dryRun =
    options.dryRun ?? parseBool(process.env.SCRAPER_DRY_RUN, false);
  const limit =
    options.limit ??
    (process.env.SCRAPER_LIMIT
      ? Math.max(1, Number(process.env.SCRAPER_LIMIT) || 24)
      : undefined);

  let targets = await resolveTargets(options);
  if (limit != null) targets = targets.slice(0, limit);

  const results: ScraperUrlResult[] = [];
  let upsert = emptyUpsert();
  let extracted = 0;

  console.log(
    `[scraper] starting ${targets.length} URL(s)${dryRun ? ' (dry-run)' : ''}…`,
  );

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]!;
    const result: ScraperUrlResult = { url: target.url, events: [] };

    if (await shouldSkipUrl(target.url)) {
      result.error = 'skipped: source marked unhealthy (3+ consecutive failures)';
      console.warn(`[scraper] skip unhealthy ${target.url}`);
      results.push(result);
      continue;
    }

    try {
      console.log(`[scraper] (${i + 1}/${targets.length}) fetch ${target.url}`);
      await withUrlProcessingTimeout(target.url, async () => {
        const text = await fetchCleanText(target.url);
        const events = await extractEventsFromText(target.url, text);
        result.events = events;
        extracted += events.length;
        console.log(`[scraper] ${target.url} → ${events.length} event(s)`);

        if (!dryRun && events.length > 0) {
          const opts: UpsertScrapedOptions = {
            venueId: target.venueId,
            latitude: target.latitude,
            longitude: target.longitude,
            forceGroupClass: target.forceGroupClass,
            scrapePageUrl: target.url,
          };
          upsert = addStats(upsert, await upsertScrapedEvents(events, opts));
        }
      });
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
      console.warn(`[scraper] skip ${target.url}: ${result.error}`);
    }

    await recordUrlResult({
      url: target.url,
      eventCount: result.events.length,
      error: result.error ?? null,
      adapterId: 'venue-web',
    });

    results.push(result);

    if (i < targets.length - 1) {
      await sleep(randomPauseMs());
    }
  }

  if (dryRun) {
    const preview: ScrapedEvent[] = results.flatMap((r) => r.events).slice(0, 20);
    console.log(
      `[scraper] dry-run — ${extracted} extracted event(s), no DB writes`,
    );
    for (const e of preview) {
      console.log(
        `  • ${e.startTime} | ${e.sportType} | ${e.title} @ ${e.locationName}${
          e.isTournament ? ' [tournament]' : e.isGroupClass ? ' [lesson]' : ''
        }`,
      );
    }
  } else {
    console.log('[scraper] upsert', upsert);
  }

  return {
    dryRun,
    urls: targets.length,
    extracted,
    upsert,
    results,
  };
}

/** Purge past listings, then re-scrape every venue website through Gemini. */
export async function runMidnightSync(
  options: RunScraperOptions = {},
): Promise<MidnightSyncReport> {
  const purge = await purgePastListings();
  const scrape = await runGeminiScraper(options);
  return {
    ok: true,
    purge,
    scrape,
  };
}
