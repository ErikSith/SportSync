import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

async function main() {
  const { enableSourceHealthDisk } = await import('../lib/scrape/source-health-fs');
  enableSourceHealthDisk();

  const { runScrapeAdapterShard } = await import('../lib/scrape/run');
  const { SCRAPE_ADAPTER_IDS } = await import('../lib/scrape/adapter-registry');
  const slot = SCRAPE_ADAPTER_IDS.indexOf('topliga-ba');
  if (slot < 0) throw new Error('topliga-ba not in registry');

  const report = await runScrapeAdapterShard(slot);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
