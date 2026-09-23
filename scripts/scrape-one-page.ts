/**
 * One-shot: scrape a single venue_scrape_pages URL and upsert into DB (Review).
 * Usage: npx tsx scripts/scrape-one-page.ts <url-or-page-id>
 */
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

import { createAdminClient } from '../lib/supabase/admin';
import { saveEventsForVenue } from '../src/lib/scraper/db-service';
import { shouldForceGroupClassFromScrapePage } from '../lib/feed/group-class';
import { shouldForceForKidsFromScrapePage } from '../lib/scrape/scrape-page-kind';
import { programKindFromScrapePage } from '../lib/programs/classify';
import { scrapeVenuePage } from '../src/lib/scraper/scrape-venue-page';

const argRaw = process.argv[2]?.trim();
if (!argRaw) {
  console.error('Usage: npx tsx scripts/scrape-one-page.ts <url-or-page-id>');
  process.exit(1);
}
const arg = argRaw;

async function main() {
  const supabase = createAdminClient();
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(arg);

  let query = supabase
    .from('venue_scrape_pages')
    .select(
      'id, url, kind, enabled, content_selector, booking_provider, booking_subject, venue_id, venues ( id, name, latitude, longitude )',
    );
  query = isUuid ? query.eq('id', arg) : query.eq('url', arg);

  const { data: page, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!page) throw new Error(`Page not found: ${arg}`);

  const venue = Array.isArray(page.venues) ? page.venues[0] : page.venues;
  const venueId =
    (page.venue_id as string | null) ?? ((venue?.id as string | null) ?? null);
  if (!venueId) throw new Error('Page has no venue_id');

  const url = page.url as string;
  const selector = (page.content_selector as string | null) ?? null;
  console.log(`[scrape-one] venue=${venue?.name ?? venueId}`);
  console.log(`[scrape-one] url=${url}`);
  console.log(`[scrape-one] selector=${selector ?? '—'}`);
  console.log(
    `[scrape-one] booking=${page.booking_provider ?? 'auto'} subject=${page.booking_subject ?? '—'}`,
  );

  const scraped = await scrapeVenuePage({
    url,
    contentSelector: selector,
    bookingProvider: (page.booking_provider as string | null) ?? null,
    bookingSubject: (page.booking_subject as string | null) ?? null,
    venueName: (venue?.name as string | null) ?? null,
  });

  console.log(
    `[scrape-one] path=${scraped.path} text=${scraped.text.length} events=${scraped.events.length}` +
      (scraped.reenioSubject ? ` reenio=${scraped.reenioSubject}` : ''),
  );
  if (scraped.message) console.log(`[scrape-one] ${scraped.message}`);

  for (const e of scraped.events.slice(0, 30)) {
    console.log(
      `  • ${e.startTime} | ${e.sportType ?? '?'} | ${e.title}` +
        (e.isTournament ? ' [T]' : e.isGroupClass ? ' [lesson]' : ''),
    );
  }

  const events = scraped.events;
  const upsert =
    events.length > 0
      ? await saveEventsForVenue(events, venueId, {
          latitude: (venue?.latitude as number | null) ?? null,
          longitude: (venue?.longitude as number | null) ?? null,
          scrapePageUrl: url,
          forceGroupClass: shouldForceGroupClassFromScrapePage(
            page.kind as string | null,
            url,
          ),
          forceForKids: shouldForceForKidsFromScrapePage(page.kind as string | null),
          forceProgramKind: programKindFromScrapePage(page.kind as string | null),
          scrapePageKind: page.kind as string | null,
        })
      : null;

  const status =
    scraped.path === 'reenio-forced'
      ? `ok:reenio:events=${events.length};+${upsert?.created ?? 0}/~${upsert?.updated ?? 0}`
      : scraped.path === 'reenio-fallback'
        ? `ok:reenio-fallback:events=${events.length};+${upsert?.created ?? 0}/~${upsert?.updated ?? 0}`
        : upsert
          ? `ok:events=${events.length};+${upsert.created}/~${upsert.updated}`
          : scraped.skippedGemini
            ? `ok:no-event-signal`
            : `ok:events=0`;

  await supabase
    .from('venue_scrape_pages')
    .update({
      last_scraped_at: new Date().toISOString(),
      last_status: status,
      enabled: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', page.id);

  console.log('[scrape-one] upsert', upsert);
}

main().catch((err) => {
  console.error('[scrape-one] failed', err);
  process.exit(1);
});
