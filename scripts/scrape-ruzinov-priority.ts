/**
 * One-shot: extract + upsert events from a curated Ružinov URL list.
 * Usage: npx tsx scripts/scrape-ruzinov-priority.ts
 */
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

import { createAdminClient } from '../lib/supabase/admin';
import { extractEventsFromText } from '../src/lib/scraper/extractor';
import { fetchCleanText, sleep } from '../src/lib/scraper/fetcher';
import { upsertScrapedEvents } from '../src/lib/scraper/db-service';

const URLS = [
  'https://www.rskruzinov.sk/novinky/podujatia-na-mesiac-august-2026',
  'https://tkslaviastu.sk/tenisove-turnaje',
  'https://tkslaviastu.sk/aktuality',
  'https://tkslaviastu.sk/turnaj-kat-a-dorastu-a12-278',
  'https://www.yourspace.sk/aktivity/skupinove-treningy/',
  'https://www.ekovps.sk/novinky',
  'https://www.tennisclassic.sk/novinky',
  'https://www.avion.sk/sk/sluzby/klzisko/aktuality',
  'https://www.loksaboxing.com/rozvrh',
  'https://www.spartans.sk/sk/rozvrh',
  'https://www.force8.sk/rozvrh',
  'https://www.aurialpadel.sk/rozvrh',
  'http://www.fighting.sk/rozvrh',
  'http://www.boxclubruzinov821.sk/rozvrh',
  'http://www.lezeckastena.sk/rozvrh',
  'https://www.rskruzinov.sk/novinky',
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
      console.log(`[priority] (${i + 1}/${URLS.length}) ${url}`);
      const text = await fetchCleanText(url);
      console.log(`[priority] text=${text.length} chars`);
      console.log(`[priority] preview: ${text.slice(0, 160).replace(/\s+/g, ' ')}`);
      const events = await extractEventsFromText(url, text);
      console.log(
        `[priority] → ${events.length} event(s)`,
        events.slice(0, 3).map((e) => `${e.title} @ ${e.startTime}${e.isTournament ? ' [T]' : ''}`),
      );
      extracted += events.length;
      if (events.length > 0) {
        const venue = await venueForUrl(url);
        const stats = await upsertScrapedEvents(events, {
          venueId: venue?.id,
          latitude: venue?.lat,
          longitude: venue?.lng,
          scrapePageUrl: url,
          forceGroupClass:
            !events.some((e) => e.isTournament) &&
            /\/(rozvrh|schedule|trening|tréning|lekci|class|skupinov)/i.test(url),
        });
        upsert.created += stats.created;
        upsert.updated += stats.updated;
        upsert.unchanged += stats.unchanged;
        upsert.skipped += stats.skipped;
        console.log(`[priority] upsert`, stats, venue?.name ?? '(no venue link)');
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      errors.push({ url, error: error.slice(0, 300) });
      console.warn(`[priority] skip: ${error.slice(0, 240)}`);
    }
    if (i < URLS.length - 1) await sleep(4000);
  }

  console.log(JSON.stringify({ extracted, upsert, errors }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
