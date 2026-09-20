/**
 * One-shot: re-scrape known women / mixed schedule sources after dedupe fix.
 */
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

import { extractEventsFromText } from '../src/lib/scraper/extractor';
import { fetchCleanText, sleep } from '../src/lib/scraper/fetcher';
import { upsertScrapedEvents } from '../src/lib/scraper/db-service';

const URLS = [
  'http://www.fighting.sk/rozvrh',
  'http://www.ladiesthaibox.sk/',
  'https://siamgym.sk/',
  'https://www.aurialpadel.sk/turnaje',
  'http://www.hanumangym.sk/',
];

async function main() {
  let created = 0;
  let womenTagged = 0;
  let extracted = 0;

  for (let i = 0; i < URLS.length; i++) {
    const url = URLS[i]!;
    console.log(`--- (${i + 1}/${URLS.length}) ${url}`);
    try {
      const text = await fetchCleanText(url);
      console.log(`[women-fix] text=${text.length} chars`);
      const events = await extractEventsFromText(url, text);
      extracted += events.length;
      const women = events.filter((e) => e.isForWomenOnly);
      womenTagged += women.length;
      console.log(
        `[women-fix] events=${events.length} women=${women.length}`,
        women.slice(0, 6).map((e) => `${e.title} @ ${e.startTime}`),
      );
      if (events.length > 0) {
        const stats = await upsertScrapedEvents(events, {
          scrapePageUrl: url,
          forceGroupClass: /rozvrh|ladies|siam|hanuman/i.test(url),
        });
        created += stats.created;
        console.log('[women-fix] upsert', stats);
      }
    } catch (err) {
      console.warn('[women-fix] fail', err instanceof Error ? err.message : err);
    }
    if (i < URLS.length - 1) await sleep(3000);
  }

  console.log(JSON.stringify({ extracted, womenTagged, created }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
