/**
 * Run selected Cheerio adapters and upsert into Supabase.
 *
 * Usage:
 *   npx tsx scripts/scrape-named-adapters.ts --adapters form-factory,aurial-padel,padel-ba,pbc-bowling
 */
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

import type { ScrapeAdapterId } from '../lib/scrape/types';

async function main() {
  const idx = process.argv.findIndex((a) => a === '--adapters' || a === '-a');
  const raw =
    idx >= 0 && process.argv[idx + 1]
      ? process.argv[idx + 1]!
      : 'form-factory,aurial-padel,padel-ba,pbc-bowling';
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean) as ScrapeAdapterId[];

  const { enableSourceHealthDisk } = await import('../lib/scrape/source-health-fs');
  enableSourceHealthDisk();

  const { runNamedScrapers } = await import('../lib/scrape/run');
  console.log(`[named] running ${ids.join(', ')}`);
  const report = await runNamedScrapers(ids);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
