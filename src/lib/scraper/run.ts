import { SCRAPE_TARGETS } from '@/lib/scrape/sources';
import { SCRAPING_SOURCES } from '@/lib/scrape/scraping-sources';
import { extractEventsFromText } from './extractor';
import { fetchCleanText, sleep, HOST_DELAY_MS } from './fetcher';
import { upsertScrapedEvents } from './db-service';
import type { ScrapedEvent, ScraperRunReport, ScraperUrlResult } from './types';

export interface RunScraperOptions {
  /** Target pages. Defaults to SCRAPE_TARGETS (+ schedule/tournament paths). */
  urls?: string[];
  /** When true, extract + log only — no Prisma writes. */
  dryRun?: boolean;
  /** Max URLs to process in one run (free-tier / politeness guard). */
  limit?: number;
}

function joinUrl(base: string, path: string): string {
  const root = base.endsWith('/') ? base : `${base}/`;
  return new URL(path.replace(/^\//, ''), root).toString();
}

/** Prefer schedule/tournament pages — homepages rarely contain dated events. */
function defaultUrls(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (url: string | undefined) => {
    const trimmed = url?.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    out.push(trimmed);
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

  // Fill with registry URLs not already covered by SCRAPE_TARGETS
  for (const source of SCRAPING_SOURCES) {
    push(source.url);
  }

  return out;
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === '') return fallback;
  return /^(1|true|yes|on)$/i.test(value);
}

/**
 * Walk a URL list: fetch clean text → Gemini extract → optional Prisma upsert.
 * Between URLs: randomized 1.5–3.5s pause. Failures on one URL do not abort the run.
 */
export async function runGeminiScraper(
  options: RunScraperOptions = {},
): Promise<ScraperRunReport> {
  const dryRun =
    options.dryRun ?? parseBool(process.env.SCRAPER_DRY_RUN, false);
  const limit =
    options.limit ??
    (process.env.SCRAPER_LIMIT
      ? Math.max(1, Number(process.env.SCRAPER_LIMIT) || 10)
      : undefined);

  let urls = options.urls?.length ? [...options.urls] : defaultUrls();
  if (limit != null) urls = urls.slice(0, limit);

  const results: ScraperUrlResult[] = [];
  const allEvents: ScrapedEvent[] = [];

  console.log(
    `[scraper] starting ${urls.length} URL(s)${dryRun ? ' (dry-run)' : ''}…`,
  );

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]!;
    const result: ScraperUrlResult = { url, events: [] };

    try {
      console.log(`[scraper] (${i + 1}/${urls.length}) fetch ${url}`);
      const text = await fetchCleanText(url);
      const events = await extractEventsFromText(url, text);
      result.events = events;
      allEvents.push(...events);
      console.log(`[scraper] ${url} → ${events.length} event(s)`);
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
      console.warn(`[scraper] skip ${url}: ${result.error}`);
    }

    results.push(result);

    if (i < urls.length - 1) {
      const pause =
        HOST_DELAY_MS.min +
        Math.floor(Math.random() * (HOST_DELAY_MS.max - HOST_DELAY_MS.min + 1));
      await sleep(pause);
    }
  }

  let upsert = { created: 0, updated: 0, unchanged: 0, skipped: 0 };
  if (dryRun) {
    console.log(
      `[scraper] dry-run — ${allEvents.length} extracted event(s), no DB writes`,
    );
    for (const e of allEvents.slice(0, 20)) {
      console.log(
        `  • ${e.startTime} | ${e.sportType} | ${e.title} @ ${e.locationName}${
          e.isTournament ? ' [tournament]' : ''
        }`,
      );
    }
  } else if (allEvents.length > 0) {
    upsert = await upsertScrapedEvents(allEvents);
    console.log('[scraper] upsert', upsert);
  }

  return {
    dryRun,
    urls: urls.length,
    extracted: allEvents.length,
    upsert,
    results,
  };
}
