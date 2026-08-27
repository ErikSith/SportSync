import type { AdapterResult } from '@/lib/scrape/types';

/**
 * Chaos MMA Bratislava currently has no trustworthy public HTML rozvrh
 * (chaosgym.sk is unreachable / schedule lives on Instagram).
 * Returning empty+error is intentional — never invent classes from dead URLs.
 */
export async function scrapeChaosMma(): Promise<AdapterResult> {
  return {
    source: 'chaos-mma',
    events: [],
    error:
      'No public Chaos MMA rozvrh URL — schedule is not on a scrapable site (do not use chaosgym.sk stubs)',
  };
}
