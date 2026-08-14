import { createAdminClient } from '../lib/supabase/admin';
import { discoverBratislavaVenues } from '../src/lib/places/discover';
import {
  listEnabledScrapePages,
  listVenuesWithWebsites,
} from '../src/lib/places/store';
import { extractEventsFromText } from '../src/lib/scraper/extractor';
import { fetchCleanText, sleep } from '../src/lib/scraper/fetcher';
import { upsertScrapedEvents } from '../src/lib/scraper/db-service';
import type { ScraperUpsertStats } from '../src/lib/scraper/types';

/** Places → website scrape cadence: 3–5s between venue sites. */
const SITE_DELAY_MS = { min: 3000, max: 5000 } as const;

function pauseMs(): number {
  return (
    SITE_DELAY_MS.min +
    Math.floor(Math.random() * (SITE_DELAY_MS.max - SITE_DELAY_MS.min + 1))
  );
}

function parseArgs(argv: string[]) {
  const dryRun = argv.includes('--dry-run') || argv.includes('-n');
  const discoverOnly = argv.includes('--discover-only');
  const scrapeOnly = argv.includes('--scrape-only');
  const limitIdx = argv.findIndex((a) => a === '--limit' || a === '-l');
  const queriesIdx = argv.findIndex((a) => a === '--queries');
  const boroughIdx = argv.findIndex((a) => a === '--borough' || a === '-b');
  const limit =
    limitIdx >= 0 && argv[limitIdx + 1] ? Number(argv[limitIdx + 1]) : undefined;
  const maxQueries =
    queriesIdx >= 0 && argv[queriesIdx + 1]
      ? Number(argv[queriesIdx + 1])
      : undefined;
  const borough =
    boroughIdx >= 0 && argv[boroughIdx + 1]
      ? argv[boroughIdx + 1]!.toLowerCase()
      : undefined;
  return {
    dryRun,
    discoverOnly,
    scrapeOnly,
    borough,
    limit: Number.isFinite(limit) ? limit : undefined,
    maxQueries: Number.isFinite(maxQueries) ? maxQueries : undefined,
  };
}

async function scrapeFromRegistry(opts: {
  dryRun: boolean;
  limit?: number;
  borough?: string;
}): Promise<{
  pages: number;
  extracted: number;
  upsert: ScraperUpsertStats;
  errors: Array<{ venue: string; url: string; error: string }>;
}> {
  let targets: Array<{
    id?: string;
    url: string;
    venueId: string | null;
    venueName: string | null;
    latitude: number | null;
    longitude: number | null;
  }> = [];

  try {
    // Prefer dated listing pages; skip websites in first pass when event pages exist.
    const pages = await listEnabledScrapePages({
      borough: opts.borough,
      limit: opts.limit ?? 40,
      kinds: ['tournaments', 'events', 'schedule'],
    });
    if (pages.length > 0) {
      targets = pages.map((p) => ({
        id: p.id,
        url: p.url,
        venueId: p.venueId,
        venueName: p.venueName,
        latitude: p.latitude,
        longitude: p.longitude,
      }));
    } else {
      const websites = await listEnabledScrapePages({
        borough: opts.borough,
        limit: opts.limit ?? 40,
        kinds: ['website'],
      });
      targets = websites.map((p) => ({
        id: p.id,
        url: p.url,
        venueId: p.venueId,
        venueName: p.venueName,
        latitude: p.latitude,
        longitude: p.longitude,
      }));
    }
  } catch {
    // Table may not exist yet — fall back to venues.website_url
    const venues = await listVenuesWithWebsites(opts.limit ?? 25);
    targets = venues.map((v) => ({
      url: v.websiteUrl,
      venueId: v.id,
      venueName: v.name,
      latitude: v.latitude,
      longitude: v.longitude,
    }));
  }

  const upsert: ScraperUpsertStats = {
    created: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    tournamentsCreated: 0,
    tournamentsUpdated: 0,
  };
  const errors: Array<{ venue: string; url: string; error: string }> = [];
  let extracted = 0;

  console.log(
    `[places-pipeline] scraping ${targets.length} page(s)${
      opts.borough ? ` [${opts.borough}]` : ''
    }${opts.dryRun ? ' (dry-run)' : ''}…`,
  );

  // Skip obvious shop/product noise from loose homepage-link discovery
  targets = targets.filter((t) => {
    try {
      const path = new URL(t.url).pathname.toLowerCase();
      if (/\/(tenisky|obuv|produkty?|eshop|cart|kosik|product|kategoria-produktu)(-|\/|$)/.test(path)) {
        return false;
      }
      if (/thestreets\.sk/i.test(t.url) && !/\/(event|novink|aktualit|turnaj)/i.test(path)) {
        return false;
      }
    } catch {
      return true;
    }
    return true;
  });

  console.log(`[places-pipeline] after noise filter: ${targets.length} page(s)`);

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]!;
    const label = target.venueName ?? target.url;
    try {
      console.log(
        `[places-pipeline] (${i + 1}/${targets.length}) ${label} → ${target.url}`,
      );
      const text = await fetchCleanText(target.url);
      const events = await extractEventsFromText(target.url, text);
      extracted += events.length;
      console.log(`[places-pipeline] → ${events.length} event(s)`);

      if (opts.dryRun) {
        for (const e of events.slice(0, 5)) {
          console.log(
            `  • ${e.startTime} | ${e.title}${e.isTournament ? ' [tournament]' : ''}`,
          );
        }
      } else if (events.length > 0) {
        const stats = await upsertScrapedEvents(events, {
          venueId: target.venueId ?? undefined,
          latitude: target.latitude,
          longitude: target.longitude,
          scrapePageUrl: target.url,
          forceGroupClass: /\/(rozvrh|schedule|trening|tréning|lekci|class)/i.test(target.url),
        });
        upsert.created += stats.created;
        upsert.updated += stats.updated;
        upsert.unchanged += stats.unchanged;
        upsert.skipped += stats.skipped;
        upsert.tournamentsCreated += stats.tournamentsCreated;
        upsert.tournamentsUpdated += stats.tournamentsUpdated;
      }

      if (target.id && !opts.dryRun) {
        const supabase = createAdminClient();
        await supabase
          .from('venue_scrape_pages')
          .update({
            last_scraped_at: new Date().toISOString(),
            last_status: `ok:${events.length}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', target.id);
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      errors.push({ venue: label, url: target.url, error });
      console.warn(`[places-pipeline] skip ${label}: ${error}`);
      if (target.id && !opts.dryRun) {
        const supabase = createAdminClient();
        await supabase
          .from('venue_scrape_pages')
          .update({
            last_scraped_at: new Date().toISOString(),
            last_status: `error:${error.slice(0, 180)}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', target.id);
      }
    }

    if (i < targets.length - 1) {
      await sleep(pauseMs());
    }
  }

  return { pages: targets.length, extracted, upsert, errors };
}

async function main() {
  const { config } = await import('dotenv');
  config({ path: '.env' });
  config({ path: '.env.local', override: true });

  const args = parseArgs(process.argv.slice(2));

  let discoverReport = null;
  if (!args.scrapeOnly) {
    discoverReport = await discoverBratislavaVenues({
      dryRun: args.dryRun,
      maxQueries: args.maxQueries,
      borough: args.borough,
    });
  }

  let scrapeReport = null;
  if (!args.discoverOnly) {
    scrapeReport = await scrapeFromRegistry({
      dryRun: args.dryRun,
      limit: args.limit,
      borough: args.borough,
    });
  }

  console.log(
    JSON.stringify(
      {
        dryRun: args.dryRun,
        borough: args.borough ?? null,
        discover: discoverReport
          ? {
              queries: discoverReport.queries,
              discovered: discoverReport.discovered,
              withWebsite: discoverReport.withWebsite,
              upserted: discoverReport.upserted,
              scrapePages: discoverReport.scrapePages,
              error: discoverReport.error,
              sample: discoverReport.places.slice(0, 8).map((p) => ({
                name: p.name,
                websiteUrl: p.websiteUrl,
                address: p.address,
              })),
            }
          : null,
        scrape: scrapeReport,
      },
      null,
      2,
    ),
  );

  if (discoverReport?.error && !args.scrapeOnly) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
