import { SCRAPE_TARGETS } from '@/lib/scrape/sources';
import { SCRAPING_SOURCES } from '@/lib/scrape/scraping-sources';
import {
  sleep,
  URL_PAUSE_MS,
  URL_PROCESS_TIMEOUT_MS,
  CLI_URL_PROCESS_TIMEOUT_MS,
  withUrlProcessingTimeout,
} from './fetcher';
import {
  saveEventsForVenue,
  upsertScrapedEvents,
  type UpsertScrapedOptions,
} from './db-service';
import { purgePastListings } from './purge';
import type {
  MidnightSyncReport,
  ScrapedEvent,
  ScraperRunReport,
  ScraperUpsertStats,
  ScraperUrlResult,
} from './types';
import { shouldForceGroupClassFromScrapePage } from '@/lib/feed/group-class';
import {
  shouldForceForKidsFromScrapePage,
  shouldSkipEventExtractForKind,
} from '@/lib/scrape/scrape-page-kind';
import { programKindFromScrapePage } from '@/lib/programs/classify';
import {
  recordUrlResult,
  shouldSkipUrl,
} from '@/lib/scrape/source-health';
import { isScrapingEnabled } from '@/lib/scrape/scraping-enabled';
import { scrapeVenuePage } from './scrape-venue-page';

export interface VenueScrapeTarget {
  url: string;
  venueId?: string;
  latitude?: number | null;
  longitude?: number | null;
  forceGroupClass?: boolean;
  forceForKids?: boolean;
  forceProgramKind?: import('@/lib/programs/classify').ProgramBucket | null;
  scrapePageKind?: string | null;
  /** Per-URL CSS selector from venue_scrape_pages.content_selector. */
  contentSelector?: string | null;
  /** null = Gemini; 'reenio' = force Reenio adapter. */
  bookingProvider?: string | null;
  bookingSubject?: string | null;
  venueName?: string | null;
}

export interface RunScraperOptions {
  /** Target pages. Defaults to Venue.websiteUrl (+ enabled scrape pages). */
  urls?: string[];
  targets?: VenueScrapeTarget[];
  /** When true, extract + log only — no Prisma writes. */
  dryRun?: boolean;
  /** Max URLs to process in one run (Vercel 300s / politeness guard). */
  limit?: number;
  /** Per-URL wall-clock budget (ms). CLI overnight defaults to 180s. */
  urlTimeoutMs?: number;
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

function emptyUpsert(): ScraperUpsertStats {
  return {
    created: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    groupClassesCreated: 0,
    specialEventsCreated: 0,
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
    groupClassesCreated: a.groupClassesCreated + b.groupClassesCreated,
    specialEventsCreated: a.specialEventsCreated + b.specialEventsCreated,
    tournamentsCreated: a.tournamentsCreated + b.tournamentsCreated,
    tournamentsUpdated: a.tournamentsUpdated + b.tournamentsUpdated,
  };
}

type VenueRow = {
  id: string;
  name: string | null;
  website_url: string | null;
  latitude: number | null;
  longitude: number | null;
};

type ScrapePageRow = {
  url: string;
  kind: string;
  venue_id: string | null;
  content_selector: string | null;
  booking_provider: string | null;
  booking_subject: string | null;
};

/**
 * Load enabled VenueScrapePage URLs tagged as events / tournaments /
 * kids_clubs / kids_camps / workshops. Bare venue websites and schedule-only
 * / availability pages are skipped. Uses Supabase service-role (same as upserts)
 * so local Prisma DATABASE_URL auth issues do not block the runner.
 */
export async function loadVenueWebsiteTargets(): Promise<VenueScrapeTarget[]> {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const supabase = createAdminClient();

  const { data: venueRows, error: venueError } = await supabase
    .from('venues')
    .select('id, name, website_url, latitude, longitude')
    .not('website_url', 'is', null);

  if (venueError) {
    throw new Error(`Failed to load venues: ${venueError.message}`);
  }

  const venues = (venueRows ?? []) as VenueRow[];
  const venueById = new Map(venues.map((v) => [v.id, v]));

  const { data: pageRows, error: pageError } = await supabase
    .from('venue_scrape_pages')
    .select(
      'url, kind, venue_id, content_selector, booking_provider, booking_subject',
    )
    .eq('enabled', true);

  if (pageError) {
    console.warn('[scraper] venue_scrape_pages load failed:', pageError.message);
  }
  const scrapePages = (pageRows ?? []) as ScrapePageRow[];

  const seen = new Map<string, VenueScrapeTarget>();
  const out: VenueScrapeTarget[] = [];

  const push = (
    url: string | null | undefined,
    venue: VenueRow | undefined,
    forceGroupClass = false,
    contentSelector?: string | null,
    forceForKids = false,
    bookingProvider?: string | null,
    bookingSubject?: string | null,
    scrapePageKind?: string | null,
  ) => {
    const trimmed = url?.trim();
    if (!trimmed || !isHttpUrl(trimmed)) return;
    const existing = seen.get(trimmed);
    if (existing) {
      if (contentSelector?.trim() && !existing.contentSelector) {
        existing.contentSelector = contentSelector.trim();
      }
      if (forceGroupClass) existing.forceGroupClass = true;
      if (forceForKids) existing.forceForKids = true;
      if (scrapePageKind && !existing.scrapePageKind) {
        existing.scrapePageKind = scrapePageKind;
        existing.forceProgramKind = programKindFromScrapePage(scrapePageKind);
      }
      if (bookingProvider && !existing.bookingProvider) {
        existing.bookingProvider = bookingProvider;
      }
      if (bookingSubject && !existing.bookingSubject) {
        existing.bookingSubject = bookingSubject;
      }
      if (venue?.id && !existing.venueId) {
        existing.venueId = venue.id;
        existing.latitude = venue.latitude ?? null;
        existing.longitude = venue.longitude ?? null;
        existing.venueName = venue.name ?? null;
      }
      return;
    }
    const target: VenueScrapeTarget = {
      url: trimmed,
      venueId: venue?.id,
      latitude: venue?.latitude ?? null,
      longitude: venue?.longitude ?? null,
      forceGroupClass,
      forceForKids,
      forceProgramKind: programKindFromScrapePage(scrapePageKind),
      scrapePageKind: scrapePageKind ?? null,
      contentSelector: contentSelector?.trim() || null,
      bookingProvider: bookingProvider?.trim() || null,
      bookingSubject: bookingSubject?.trim() || null,
      venueName: venue?.name ?? null,
    };
    seen.set(trimmed, target);
    out.push(target);
  };

  // Only admin-tagged scrape pages — never crawl bare venue homepage blindly.
  for (const page of scrapePages) {
    const venue = page.venue_id ? venueById.get(page.venue_id) : undefined;
    const kind = (page.kind ?? '').toLowerCase();
    // events | tournaments | kids_clubs | kids_camps | workshops (alone or mixed)
    if (shouldSkipEventExtractForKind(kind)) continue;
    const forceGroupClass = shouldForceGroupClassFromScrapePage(kind, page.url);
    const forceForKids = shouldForceForKidsFromScrapePage(kind);
    push(
      page.url,
      venue,
      forceGroupClass,
      page.content_selector,
      forceForKids,
      page.booking_provider,
      page.booking_subject,
      kind,
    );
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
 * Walk venue websites: fetch clean text → Gemini Flash extract → DB upsert.
 * Between URLs: fixed 3500 ms pause. Failures on one URL do not abort the run.
 */
export async function runGeminiScraper(
  options: RunScraperOptions = {},
): Promise<ScraperRunReport> {
  if (!isScrapingEnabled()) {
    console.log('[scraper] skipped — SCRAPING_ENABLED is off (venues publish via /manage)');
    return {
      dryRun: options.dryRun ?? false,
      urls: 0,
      extracted: 0,
      upsert: emptyUpsert(),
      results: [],
    };
  }
  const dryRun =
    options.dryRun ?? parseBool(process.env.SCRAPER_DRY_RUN, false);
  const limit =
    options.limit ??
    (process.env.SCRAPER_LIMIT
      ? Math.max(1, Number(process.env.SCRAPER_LIMIT) || 24)
      : undefined);
  const urlTimeoutMs = options.urlTimeoutMs ?? URL_PROCESS_TIMEOUT_MS;

  let targets = await resolveTargets(options);
  if (limit != null) targets = targets.slice(0, limit);

  const results: ScraperUrlResult[] = [];
  let upsert = emptyUpsert();
  let extracted = 0;

  console.log(
    `[scraper] starting ${targets.length} URL(s)${dryRun ? ' (dry-run)' : ''}… (urlTimeout=${urlTimeoutMs}ms)`,
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
      await withUrlProcessingTimeout(
        target.url,
        async () => {
          const scraped = await scrapeVenuePage({
            url: target.url,
            contentSelector: target.contentSelector,
            bookingProvider: target.bookingProvider,
            bookingSubject: target.bookingSubject,
            venueName: target.venueName,
            // Kind drives force-extract, card→detail seeds, and kids_clubs → courses.
            scrapePageKind: target.scrapePageKind,
          });
          if (scraped.path === 'empty' && scraped.events.length === 0) {
            if (scraped.skippedGemini) {
              result.skippedGemini = true;
              console.log(
                `[scraper] skip (${scraped.message ?? 'empty'}) ${target.url}`,
              );
              return;
            }
            throw new Error(
              scraped.message ?? `No events from ${target.url}`,
            );
          }
          const events = scraped.events;
          result.events = events;
          result.skippedGemini = scraped.skippedGemini;
          extracted += events.length;
          const kids = events.filter((e) => e.isForKids).length;
          const women = events.filter((e) => e.isForWomenOnly).length;
          console.log(
            `[scraper] ${target.url} → ${events.length} event(s) [${scraped.path}]` +
              (kids || women ? ` [kids=${kids} women=${women}]` : ''),
          );

          if (!dryRun && events.length > 0) {
            const opts: UpsertScrapedOptions = {
              latitude: target.latitude,
              longitude: target.longitude,
              forceGroupClass: target.forceGroupClass,
              forceForKids: target.forceForKids,
              forceProgramKind: target.forceProgramKind,
              scrapePageKind: target.scrapePageKind,
              scrapePageUrl: target.url,
            };
            const writeStats = target.venueId
              ? await saveEventsForVenue(events, target.venueId, opts)
              : await upsertScrapedEvents(events, opts);
            upsert = addStats(upsert, writeStats);
          }
        },
        urlTimeoutMs,
      );
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
      await sleep(URL_PAUSE_MS);
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
