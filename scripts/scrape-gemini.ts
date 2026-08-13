import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

import { runGeminiScraper } from '../src/lib/scraper/run';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-n');
  const limitIdx = args.findIndex((a) => a === '--limit' || a === '-l');
  const limit =
    limitIdx >= 0 && args[limitIdx + 1]
      ? Number(args[limitIdx + 1])
      : undefined;
  const urlArgs = args.filter(
    (a) => a.startsWith('http://') || a.startsWith('https://'),
  );

  const report = await runGeminiScraper({
    dryRun,
    limit: Number.isFinite(limit) ? limit : undefined,
    urls: urlArgs.length ? urlArgs : undefined,
  });

  console.log(
    JSON.stringify(
      {
        dryRun: report.dryRun,
        urls: report.urls,
        extracted: report.extracted,
        upsert: report.upsert,
        errors: report.results
          .filter((r) => r.error)
          .map((r) => ({ url: r.url, error: r.error })),
      },
      null,
      2,
    ),
  );

  const hardFail =
    report.extracted === 0 &&
    report.results.length > 0 &&
    report.results.every((r) => r.error);
  if (hardFail) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
