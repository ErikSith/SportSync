/**
 * Scrape all enabled venue_scrape_pages for venues marked scrapeReviewDone
 * in Admin Reviewer (amenities.scrapeReviewDone = true).
 *
 * Usage: npx tsx scripts/scrape-review-done.ts
 * Options: --dry-run (list only), --limit=N (max pages)
 */
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

import { createAdminClient } from '../lib/supabase/admin';
import { shouldForceGroupClassFromScrapePage } from '../lib/feed/group-class';
import {
  shouldForceForKidsFromScrapePage,
  shouldSkipEventExtractForKind,
} from '../lib/scrape/scrape-page-kind';
import { saveEventsForVenue } from '../src/lib/scraper/db-service';
import { scrapeVenuePage } from '../src/lib/scraper/scrape-venue-page';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function delayMs() {
  return 1500 + Math.floor(Math.random() * 2000);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Math.max(1, Number(limitArg.slice('--limit='.length)) || 0) : 0;

  const supabase = createAdminClient();

  const { data: venues, error: vErr } = await supabase
    .from('venues')
    .select('id, name, latitude, longitude, amenities')
    .contains('amenities', { scrapeReviewDone: true })
    .order('name', { ascending: true });

  if (vErr) throw new Error(vErr.message);

  const doneVenues = venues ?? [];
  console.log(`[review-done] venues marked hotové: ${doneVenues.length}`);
  if (doneVenues.length === 0) {
    console.log('[review-done] nothing to scrape');
    return;
  }

  const venueIds = doneVenues.map((v) => v.id as string);
  const venueById = new Map(doneVenues.map((v) => [v.id as string, v]));

  const pages: Array<Record<string, unknown>> = [];
  const chunkSize = 100;
  for (let i = 0; i < venueIds.length; i += chunkSize) {
    const chunk = venueIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('venue_scrape_pages')
      .select(
        'id, url, kind, enabled, content_selector, booking_provider, booking_subject, venue_id',
      )
      .in('venue_id', chunk)
      .eq('enabled', true)
      .order('url', { ascending: true });
    if (error) throw new Error(error.message);
    for (const row of data ?? []) pages.push(row as Record<string, unknown>);
  }

  const runnable = pages.filter((p) => {
    const kind = String(p.kind ?? '');
    return !shouldSkipEventExtractForKind(kind);
  });

  const skippedAvailability = pages.length - runnable.length;
  const work = limit > 0 ? runnable.slice(0, limit) : runnable;

  console.log(
    `[review-done] scrape pages: ${pages.length} enabled, ${runnable.length} runnable` +
      (skippedAvailability ? ` (skip ${skippedAvailability} availability-only)` : '') +
      (limit > 0 ? `, limited to ${work.length}` : ''),
  );

  for (const p of work) {
    const venue = venueById.get(p.venue_id as string);
    console.log(
      `  • ${venue?.name ?? p.venue_id} | ${p.kind} | ${p.url}`,
    );
  }

  if (dryRun) {
    console.log('[review-done] dry-run — no fetch');
    return;
  }

  let ok = 0;
  let failed = 0;
  let totalEvents = 0;
  let totalCreated = 0;
  let totalUpdated = 0;

  for (let i = 0; i < work.length; i++) {
    const page = work[i]!;
    const venue = venueById.get(page.venue_id as string);
    const venueId = page.venue_id as string;
    const url = page.url as string;
    const kind = String(page.kind ?? '');
    const selector = (page.content_selector as string | null) ?? null;

    console.log(
      `\n[${i + 1}/${work.length}] ${venue?.name ?? venueId}\n  ${url} (${kind})`,
    );

    try {
      const scraped = await scrapeVenuePage({
        url,
        contentSelector: selector,
        bookingProvider: (page.booking_provider as string | null) ?? null,
        bookingSubject: (page.booking_subject as string | null) ?? null,
        venueName: (venue?.name as string | null) ?? null,
      });

      console.log(
        `  path=${scraped.path} text=${scraped.text.length} events=${scraped.events.length}` +
          (scraped.message ? ` — ${scraped.message}` : ''),
      );

      for (const e of scraped.events.slice(0, 12)) {
        console.log(
          `    • ${e.startTime} | ${e.sportType ?? '?'} | ${e.title}` +
            (e.isTournament ? ' [T]' : e.isGroupClass ? ' [lesson]' : ''),
        );
      }
      if (scraped.events.length > 12) {
        console.log(`    … +${scraped.events.length - 12} more`);
      }

      const upsert =
        scraped.events.length > 0
          ? await saveEventsForVenue(scraped.events, venueId, {
              latitude: (venue?.latitude as number | null) ?? null,
              longitude: (venue?.longitude as number | null) ?? null,
              scrapePageUrl: url,
              forceGroupClass: shouldForceGroupClassFromScrapePage(kind, url),
              forceForKids: shouldForceForKidsFromScrapePage(kind),
            })
          : null;

      const status =
        scraped.path === 'reenio-forced'
          ? `ok:reenio:events=${scraped.events.length};+${upsert?.created ?? 0}/~${upsert?.updated ?? 0}`
          : scraped.path === 'reenio-fallback'
            ? `ok:reenio-fallback:events=${scraped.events.length};+${upsert?.created ?? 0}/~${upsert?.updated ?? 0}`
            : upsert
              ? `ok:events=${scraped.events.length};+${upsert.created}/~${upsert.updated}`
              : scraped.skippedGemini
                ? 'ok:no-event-signal'
                : 'ok:events=0';

      await supabase
        .from('venue_scrape_pages')
        .update({
          last_scraped_at: new Date().toISOString(),
          last_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', page.id as string);

      console.log(`  status=${status}`);
      ok += 1;
      totalEvents += scraped.events.length;
      totalCreated += upsert?.created ?? 0;
      totalUpdated += upsert?.updated ?? 0;
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ERROR: ${msg}`);
      await supabase
        .from('venue_scrape_pages')
        .update({
          last_scraped_at: new Date().toISOString(),
          last_status: `error:${msg.slice(0, 180)}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', page.id as string);
    }

    if (i < work.length - 1) {
      const wait = delayMs();
      console.log(`  … wait ${wait}ms`);
      await sleep(wait);
    }
  }

  console.log(
    `\n[review-done] done ok=${ok} failed=${failed} events=${totalEvents} created=${totalCreated} updated=${totalUpdated}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
