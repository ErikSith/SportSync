/**
 * Main scraper entry — polite sequential crawl with a fixed 3500 ms gap
 * between URLs and CLI support for `--dry-run`.
 *
 * Library: `import { runScraper } from '@/src/lib/scraper/runner'`
 * CLI:     `npx tsx src/lib/scraper/runner.ts [--dry-run] [--limit N] [url…]`
 * npm:     `npm run scrape:gemini -- --dry-run`
 */
import { config } from 'dotenv';
import { enableSourceHealthDisk } from '@/lib/scrape/source-health-fs';
import { CLI_URL_PROCESS_TIMEOUT_MS, URL_PAUSE_MS } from './fetcher';
import {
  runGeminiScraper,
  runMidnightSync,
  loadVenueWebsiteTargets,
  type RunScraperOptions,
  type VenueScrapeTarget,
} from './run';

config({ path: '.env' });
config({ path: '.env.local', override: true });

export const URL_GAP_MS = URL_PAUSE_MS;

export {
  runGeminiScraper,
  runMidnightSync,
  loadVenueWebsiteTargets,
  type RunScraperOptions,
  type VenueScrapeTarget,
};

/** Alias used by task docs / external callers. */
export async function runScraper(options: RunScraperOptions = {}) {
  return runGeminiScraper(options);
}

export function parseScraperCliArgs(argv: string[]): RunScraperOptions {
  const dryRun = argv.includes('--dry-run') || argv.includes('-n');
  const limitIdx = argv.findIndex((a) => a === '--limit' || a === '-l');
  const limitRaw =
    limitIdx >= 0 && argv[limitIdx + 1] ? Number(argv[limitIdx + 1]) : undefined;
  const urls = argv.filter(
    (a) => a.startsWith('http://') || a.startsWith('https://'),
  );

  return {
    dryRun,
    limit: Number.isFinite(limitRaw) ? limitRaw : undefined,
    urls: urls.length ? urls : undefined,
  };
}

/** Shared CLI entry used by `runner.ts` and `scripts/scrape-gemini.ts`. */
export async function runScraperCli(argv = process.argv.slice(2)): Promise<void> {
  enableSourceHealthDisk();
  const options = parseScraperCliArgs(argv);
  // Overnight correctness: Gemini quota backoff must fit inside the per-URL budget.
  const urlTimeoutMs =
    Number(process.env.SCRAPER_URL_TIMEOUT_MS) > 0
      ? Number(process.env.SCRAPER_URL_TIMEOUT_MS)
      : CLI_URL_PROCESS_TIMEOUT_MS;

  console.log(
    `[scraper.runner] URL gap=${URL_PAUSE_MS}ms timeout=${urlTimeoutMs}ms${
      options.dryRun ? ' dry-run' : ''
    }`,
  );

  const report = await runScraper({ ...options, urlTimeoutMs });

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

const isDirectCli =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  /[\\/]runner\.(ts|js|mjs|cjs)$/i.test(process.argv[1]);

if (isDirectCli) {
  runScraperCli().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
