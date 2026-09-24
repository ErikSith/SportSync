/**
 * City-wide Bratislava listing scrape: events / group classes / tournaments /
 * kids clubs / camps / workshops — same pipeline as admin + scrape:gemini
 * (Gemini → card→detail → page images → Reenio).
 *
 * Usage:
 *   npx tsx scripts/scrape-bratislava.ts --boroughs ruzinov,petrzalka,dubravka
 *   npx tsx scripts/scrape-bratislava.ts --all --limit 200
 *   npx tsx scripts/scrape-bratislava.ts --boroughs petrzalka --dry-run --limit 20
 *   npx tsx scripts/scrape-bratislava.ts --kinds kids_clubs,kids_camps,workshops
 */
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

import { listEnabledScrapePages } from '../src/lib/places/store';
import { scrapeVenuePage } from '../src/lib/scraper/scrape-venue-page';
import { upsertScrapedEvents } from '../src/lib/scraper/db-service';
import { sleep } from '../src/lib/scraper/fetcher';
import type { ScraperUpsertStats } from '../src/lib/scraper/types';
import {
  shouldForceGroupClassFromScrapePage,
} from '../lib/feed/group-class';
import { classifyListingHubBucket } from '../lib/scrape/listing-bucket';
import { programKindFromScrapePage } from '../lib/programs/classify';
import { shouldForceForKidsFromScrapePage } from '../lib/scrape/scrape-page-kind';
import { createAdminClient } from '../lib/supabase/admin';

const LISTING_KINDS = [
  'tournaments',
  'events',
  'schedule',
  'kids_clubs',
  'kids_camps',
  'workshops',
] as const;
const DEFAULT_BOROUGHS = ['ruzinov', 'petrzalka', 'dubravka'] as const;
/** Gemini Flash ~15 RPM — keep a gap between page extracts. */
const PAGE_GAP_MS = { min: 2500, max: 4000 } as const;
const SKIP_RECENT_HOURS = 12;

function parseArgs(argv: string[]) {
  const dryRun = argv.includes('--dry-run') || argv.includes('-n');
  const allBoroughs = argv.includes('--all');
  const neverOnly = argv.includes('--never-scraped');
  const boroughsIdx = argv.findIndex((a) => a === '--boroughs' || a === '--borough' || a === '-b');
  const limitIdx = argv.findIndex((a) => a === '--limit' || a === '-l');
  const kindsIdx = argv.findIndex((a) => a === '--kinds');
  const rawBoroughs =
    boroughsIdx >= 0 && argv[boroughsIdx + 1]
      ? argv[boroughsIdx + 1]!.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
      : allBoroughs
        ? []
        : [...DEFAULT_BOROUGHS];
  const limit =
    limitIdx >= 0 && argv[limitIdx + 1] ? Number(argv[limitIdx + 1]) : allBoroughs ? 220 : 160;
  const kinds =
    kindsIdx >= 0 && argv[kindsIdx + 1]
      ? argv[kindsIdx + 1]!.split(',').map((k) => k.trim()).filter(Boolean)
      : [...LISTING_KINDS];
  return {
    dryRun,
    boroughs: rawBoroughs,
    kinds,
    neverScrapedOnly: neverOnly,
    limit: Number.isFinite(limit) ? Math.max(1, limit) : 160,
  };
}

function pauseMs(): number {
  return PAGE_GAP_MS.min + Math.floor(Math.random() * (PAGE_GAP_MS.max - PAGE_GAP_MS.min + 1));
}

function skipShopNoise(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    if (/\/(tenisky|obuv|produkty?|eshop|cart|kosik|product|kategoria-produktu)(-|\/|$)/.test(path)) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function classify(
  title: string,
  description: string | null | undefined,
  url: string,
  flags?: {
    isTournament?: boolean;
    isCamp?: boolean;
    isWorkshop?: boolean;
    isCourse?: boolean;
    isGroupClass?: boolean;
    scrapePageKind?: string | null;
  },
) {
  const hub = classifyListingHubBucket({
    title,
    description,
    sourceUrl: url,
    isTournament: flags?.isTournament,
    isCamp: flags?.isCamp,
    isWorkshop: flags?.isWorkshop,
    isCourse: flags?.isCourse,
    isGroupClass: flags?.isGroupClass,
    scrapePageKind: flags?.scrapePageKind,
    forceProgramKind: programKindFromScrapePage(flags?.scrapePageKind),
    forceGroupClass: shouldForceGroupClassFromScrapePage(flags?.scrapePageKind, url),
  });
  if (hub.bucket === 'program') {
    if (hub.programKind === 'camps') return 'camp' as const;
    if (hub.programKind === 'workshops') return 'workshop' as const;
    return 'course' as const;
  }
  if (hub.bucket === 'tournament') return 'tournament' as const;
  if (hub.bucket === 'group_class') return 'group_class' as const;
  if (hub.bucket === 'event') return 'event' as const;
  return 'skip' as const;
}

function emptyClassCounts() {
  return {
    event: 0,
    group_class: 0,
    tournament: 0,
    camp: 0,
    workshop: 0,
    course: 0,
    skip: 0,
  };
}

async function markPage(
  id: string | undefined,
  dryRun: boolean,
  status: string,
) {
  if (!id || dryRun) return;
  const supabase = createAdminClient();
  await supabase
    .from('venue_scrape_pages')
    .update({
      last_scraped_at: new Date().toISOString(),
      last_status: status.slice(0, 180),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const skipAfter = new Date(Date.now() - SKIP_RECENT_HOURS * 60 * 60 * 1000).toISOString();

  let targets = await listEnabledScrapePages({
    boroughs: args.boroughs.length ? args.boroughs : undefined,
    limit: args.limit,
    kinds: args.kinds,
    neverScrapedOnly: args.neverScrapedOnly,
    skipScrapedAfter: args.neverScrapedOnly ? undefined : skipAfter,
  });
  targets = targets.filter((t) => !skipShopNoise(t.url));

  const byBorough: Record<string, number> = {};
  for (const t of targets) {
    const key = t.borough ?? '(none)';
    byBorough[key] = (byBorough[key] ?? 0) + 1;
  }

  console.log(
    `[ba-scrape] ${targets.length} listing page(s)` +
      `${args.boroughs.length ? ` [${args.boroughs.join(',')}]` : ' [all Bratislava]'}` +
      `${args.dryRun ? ' (dry-run)' : ''}`,
  );
  console.log(`[ba-scrape] queue by borough`, byBorough);

  const upsert: ScraperUpsertStats = {
    created: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    groupClassesCreated: 0,
    specialEventsCreated: 0,
    tournamentsCreated: 0,
    tournamentsUpdated: 0,
  };
  const extractedClass = emptyClassCounts();
  const extractedByBorough: Record<string, ReturnType<typeof emptyClassCounts>> = {};
  const errors: Array<{ venue: string; url: string; borough: string | null; error: string }> = [];
  let extracted = 0;
  let consecutiveGeminiFails = 0;

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]!;
    const label = target.venueName ?? target.url;
    const borough = target.borough ?? '(none)';
    const kind = target.kind ?? null;
    try {
      console.log(
        `[ba-scrape] (${i + 1}/${targets.length}) [${borough}/${kind}] ${label} → ${target.url}`,
      );
      const scraped = await scrapeVenuePage({
        url: target.url,
        contentSelector: target.contentSelector,
        venueName: target.venueName,
        scrapePageKind: kind,
      });
      consecutiveGeminiFails = 0;
      const events = scraped.events;
      extracted += events.length;

      if (!extractedByBorough[borough]) extractedByBorough[borough] = emptyClassCounts();
      for (const event of events) {
        const bucket = classify(event.title, event.description, target.url, {
          isTournament: event.isTournament,
          isCamp: event.isCamp,
          isWorkshop: event.isWorkshop,
          isCourse: event.isCourse,
          isGroupClass: event.isGroupClass,
          scrapePageKind: kind,
        });
        extractedClass[bucket] += 1;
        extractedByBorough[borough]![bucket] += 1;
      }

      console.log(
        `[ba-scrape] → ${events.length} listing(s) [${scraped.path}]`,
        events.slice(0, 3).map(
          (e) =>
            `${e.title} [${classify(e.title, e.description, target.url, {
              isTournament: e.isTournament,
              isCamp: e.isCamp,
              isWorkshop: e.isWorkshop,
              isCourse: e.isCourse,
              isGroupClass: e.isGroupClass,
              scrapePageKind: kind,
            })}]`,
        ),
      );

      if (args.dryRun) {
        await markPage(target.id, true, `ok:${scraped.path}:${events.length}`);
      } else if (events.length > 0) {
        const stats = await upsertScrapedEvents(events, {
          venueId: target.venueId ?? undefined,
          latitude: target.latitude,
          longitude: target.longitude,
          scrapePageUrl: target.url,
          forceGroupClass: shouldForceGroupClassFromScrapePage(kind, target.url),
          forceForKids: shouldForceForKidsFromScrapePage(kind),
          forceProgramKind: programKindFromScrapePage(kind),
          scrapePageKind: kind,
        });
        upsert.created += stats.created;
        upsert.updated += stats.updated;
        upsert.unchanged += stats.unchanged;
        upsert.skipped += stats.skipped;
        upsert.groupClassesCreated += stats.groupClassesCreated;
        upsert.specialEventsCreated += stats.specialEventsCreated;
        upsert.tournamentsCreated += stats.tournamentsCreated;
        upsert.tournamentsUpdated += stats.tournamentsUpdated;
      }

      await markPage(
        target.id,
        args.dryRun,
        scraped.events.length === 0 && scraped.skippedGemini
          ? `ok:no-event-signal:${scraped.path}`
          : `ok:${scraped.path}:${events.length}`,
      );
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      errors.push({ venue: label, url: target.url, borough: target.borough, error: error.slice(0, 300) });
      console.warn(`[ba-scrape] skip ${label}: ${error.slice(0, 240)}`);
      if (/GoogleGenerativeAI|All Gemini models|quota|high demand|429/i.test(error)) {
        consecutiveGeminiFails += 1;
        if (consecutiveGeminiFails >= 5) {
          console.error('[ba-scrape] Gemini unavailable after 5 consecutive pages — stopping early');
          break;
        }
      } else {
        consecutiveGeminiFails = 0;
      }
      await markPage(target.id, args.dryRun, `error:${error}`);
    }

    if (i < targets.length - 1) await sleep(pauseMs());
  }

  console.log(
    JSON.stringify(
      {
        dryRun: args.dryRun,
        boroughs: args.boroughs.length ? args.boroughs : 'all',
        pages: targets.length,
        extracted,
        classified: extractedClass,
        byBorough: extractedByBorough,
        upsert,
        errors,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
