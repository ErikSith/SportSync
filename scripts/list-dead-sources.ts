/**
 * List scrape sources marked unhealthy / skipped.
 *
 * Usage:
 *   npx tsx scripts/list-dead-sources.ts
 *   npx tsx scripts/list-dead-sources.ts --all   # include not-yet-skipped problems
 *   npx tsx scripts/list-dead-sources.ts --revive <key-or-url>
 */

import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

async function main() {
  const { enableSourceHealthDisk } = await import('../lib/scrape/source-health-fs');
  enableSourceHealthDisk();

  const {
    formatHealthEntryLine,
    listProblemSources,
    listSkippedSources,
    reviveSource,
  } = await import('../lib/scrape/source-health');

  const args = process.argv.slice(2);
  const reviveIdx = args.indexOf('--revive');
  if (reviveIdx >= 0) {
    const key = args[reviveIdx + 1];
    if (!key) {
      console.error('Usage: --revive <adapter:id|url>');
      process.exitCode = 1;
      return;
    }
    const revived = await reviveSource(key);
    if (!revived) {
      console.error(`No health entry for: ${key}`);
      process.exitCode = 1;
      return;
    }
    console.log('Revived:', formatHealthEntryLine(revived));
    return;
  }

  const showAll = args.includes('--all');
  const entries = showAll ? await listProblemSources() : await listSkippedSources();

  if (entries.length === 0) {
    console.log(
      showAll
        ? 'No problem sources recorded yet.'
        : 'No skipped sources yet (need 3 consecutive failures).',
    );
    console.log('Tip: run `npx tsx scripts/list-dead-sources.ts --all` for partial failures.');
    return;
  }

  console.log(
    showAll
      ? `Problem sources (${entries.length}):`
      : `Skipped sources — check manually (${entries.length}):`,
  );
  for (const entry of entries) {
    console.log(`  ${formatHealthEntryLine(entry)}`);
  }
  console.log('\nFile: lib/scrape/source-health.json');
  console.log('Revive: npx tsx scripts/list-dead-sources.ts --revive <key-or-url>');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
