/**
 * Scrape high-yield BA adapters → JSON (no Supabase admin required).
 * Usage: npx tsx scripts/scrape-to-json.ts
 */
import { writeFileSync } from 'fs';
import { join } from 'path';
import { scrapeAurialPadel } from '../lib/scrape/adapters/aurial-padel';
import { scrapeFormFactory } from '../lib/scrape/adapters/form-factory';
import { scrapeCitylife } from '../lib/scrape/adapters/citylife';
import { scrapeStz } from '../lib/scrape/adapters/stz';
import { scrapePredpredaj } from '../lib/scrape/adapters/predpredaj';
import { scrapeNtcBa } from '../lib/scrape/adapters/ntc-ba';
import { scrapeBaMarathon } from '../lib/scrape/adapters/ba-marathon';
import { scrapeTopligaBa } from '../lib/scrape/adapters/topliga-ba';
import { scrapeNivyZone } from '../lib/scrape/adapters/nivy-zone';
import { scrapeBlockDock } from '../lib/scrape/adapters/block-dock';
import { scrapeArealNevadzova } from '../lib/scrape/adapters/areal-nevadzova';
import { scrapeK2Lezenie } from '../lib/scrape/adapters/k2-lezenie';
import { scrapeWakelake } from '../lib/scrape/adapters/wakelake';
import { scrapeBncBa } from '../lib/scrape/adapters/bnc-ba';
import { scrapeDivokaVoda } from '../lib/scrape/adapters/divoka-voda';
import { scrapeHorskyBeh } from '../lib/scrape/adapters/horsky-beh';
import { tagScrapedEventLocation } from '../lib/scrape/tag-location';
import type { AdapterResult } from '../lib/scrape/types';

async function main() {
  const scrapers = [
    scrapeAurialPadel,
    scrapeFormFactory,
    scrapeCitylife,
    scrapeStz,
    scrapePredpredaj,
    scrapeNtcBa,
    scrapeBaMarathon,
    scrapeTopligaBa,
    scrapeNivyZone,
    scrapeBlockDock,
    scrapeArealNevadzova,
    scrapeK2Lezenie,
    scrapeWakelake,
    scrapeBncBa,
    scrapeDivokaVoda,
    scrapeHorskyBeh,
  ];

  const results: AdapterResult[] = [];
  for (const scrape of scrapers) {
    const r = await scrape();
    console.error(`[scrape] ${r.source}: ${r.events.length}${r.error ? ` ERR ${r.error}` : ''}`);
    results.push(r);
  }

  const events = results.flatMap((r) =>
    r.events.map((e) => {
      const tagged = tagScrapedEventLocation(e);
      return {
        ...tagged,
        startsAt: tagged.startsAt.toISOString(),
      };
    }),
  );

  const out = join(process.cwd(), 'tmp-scrape-result.json');
  writeFileSync(out, JSON.stringify({ scrapedAt: new Date().toISOString(), events, adapters: results.map((r) => ({ source: r.source, count: r.events.length, error: r.error })) }, null, 2));
  console.log(out);
  console.log(JSON.stringify({ total: events.length, tournaments: events.filter((e) => e.category === 'tournament').length, events: events.filter((e) => e.category !== 'tournament').length }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
