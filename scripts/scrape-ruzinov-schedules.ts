/**
 * Extract weekly schedule pages into dated lesson events.
 * Usage: npx tsx scripts/scrape-ruzinov-schedules.ts
 */
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

import { createAdminClient } from '../lib/supabase/admin';
import { extractEventsFromText } from '../src/lib/scraper/extractor';
import { fetchCleanText, sleep } from '../src/lib/scraper/fetcher';
import { upsertScrapedEvents } from '../src/lib/scraper/db-service';

const URLS = [
  'http://www.fighting.sk/rozvrh',
  'https://www.force8.sk/rozvrh',
  'https://www.aurialpadel.sk/rozvrh',
  'https://www.spartans.sk/sk/rozvrh',
  'http://www.boxclubruzinov821.sk/rozvrh',
  'https://www.loksaboxing.com/rozvrh',
  'http://www.fitworld.sk/rozvrh',
  'http://www.aircraftsport.sk/rozvrh',
  'https://www.yourspace.sk/aktivity/skupinove-treningy/',
];

async function venueForUrl(url: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('venue_scrape_pages')
    .select('venue_id, venues ( id, name, latitude, longitude )')
    .eq('url', url)
    .maybeSingle();
  const venue = Array.isArray(data?.venues) ? data?.venues[0] : data?.venues;
  if (!venue) return null;
  return {
    id: String(venue.id),
    name: String(venue.name),
    lat: (venue.latitude as number | null) ?? null,
    lng: (venue.longitude as number | null) ?? null,
  };
}

async function main() {
  let extracted = 0;
  const upsert = { created: 0, updated: 0, unchanged: 0, skipped: 0 };
  const errors: Array<{ url: string; error: string }> = [];

  for (let i = 0; i < URLS.length; i++) {
    const url = URLS[i]!;
    try {
      console.log(`[schedules] (${i + 1}/${URLS.length}) ${url}`);
      const text = await fetchCleanText(url);
      console.log(`[schedules] text=${text.length}`);
      const events = await extractEventsFromText(url, text);
      console.log(
        `[schedules] → ${events.length}`,
        events.slice(0, 4).map((e) => `${e.title} @ ${e.startTime}`),
      );
      extracted += events.length;
      if (events.length > 0) {
        const venue = await venueForUrl(url);
        const stats = await upsertScrapedEvents(events, {
          venueId: venue?.id,
          latitude: venue?.lat,
          longitude: venue?.lng,
          scrapePageUrl: url,
          forceGroupClass: /\/(rozvrh|schedule|trening|tréning|lekci|class|skupinov)/i.test(url),
        });
        upsert.created += stats.created;
        upsert.updated += stats.updated;
        upsert.unchanged += stats.unchanged;
        upsert.skipped += stats.skipped;
        console.log(`[schedules] upsert`, stats, venue?.name ?? '(no venue)');
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      errors.push({ url, error: error.slice(0, 280) });
      console.warn(`[schedules] skip: ${error.slice(0, 220)}`);
    }
    if (i < URLS.length - 1) await sleep(5000);
  }

  console.log(JSON.stringify({ extracted, upsert, errors }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
