import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

async function main() {
  const { cleanupDuplicateEventsByIdentity } = await import(
    '../lib/scrape/cleanup-duplicate-events'
  );

  console.log('[cleanup] removing events with same title + date/time…');
  const report = await cleanupDuplicateEventsByIdentity();
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
