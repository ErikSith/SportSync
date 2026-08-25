import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

async function main() {
  const { cleanupExpiredEvents } = await import('../lib/retention/events');
  const { runAllScrapers } = await import('../lib/scrape/run');

  console.log('[scrape] cleanup expired scraped events/tournaments…');
  const cleanup = await cleanupExpiredEvents();
  console.log(JSON.stringify({ cleanup }, null, 2));

  console.log('[scrape] remove duplicate title+datetime events…');
  const { cleanupDuplicateEventsByIdentity } = await import(
    '../lib/scrape/cleanup-duplicate-events'
  );
  const dedupe = await cleanupDuplicateEventsByIdentity();
  console.log(JSON.stringify({ dedupe }, null, 2));

  console.log('[scrape] starting Bratislava adapters (Node full fleet — not Cloudflare Edge)…');
  const report = await runAllScrapers();
  console.log(JSON.stringify(report, null, 2));

  const { listSkippedSources, formatHealthEntryLine } = await import(
    '../lib/scrape/source-health'
  );
  const skipped = await listSkippedSources();
  if (skipped.length > 0) {
    console.log(`\n[scrape] skipped unhealthy sources (${skipped.length}):`);
    for (const entry of skipped) {
      console.log(`  ${formatHealthEntryLine(entry)}`);
    }
    console.log('Review later: npx tsx scripts/list-dead-sources.ts');
  }

  const failed = report.adapters.filter((a) => a.error && a.count === 0);
  if (failed.length === report.adapters.length && report.created + report.updated === 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
