/**
 * Thin CLI wrapper — implementation lives in `src/lib/scraper/runner.ts`.
 * Usage: npm run scrape:gemini -- --dry-run [--limit N] [url…]
 */
import { runScraperCli } from '../src/lib/scraper/runner';

runScraperCli().catch((err) => {
  console.error(err);
  process.exit(1);
});
