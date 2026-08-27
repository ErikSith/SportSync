import { scrapeTextListing } from '@/lib/scrape/adapters/_text-listing';
import type { AdapterResult } from '@/lib/scrape/types';
import { canonicalScrapeSport } from '@/lib/scrape/sources';

/** Petržalské Bowlingové Centrum — pbc.sk is empty; live site is bowlingpbc.sk. */
export async function scrapePbcBowling(): Promise<AdapterResult> {
  return scrapeTextListing({
    source: 'pbc-bowling',
    sport: canonicalScrapeSport('BOWLING'),
    venueKey: 'pbc-bowling',
    urls: [
      'http://www.bowlingpbc.sk/',
      'https://www.bowlingpbc.sk/',
    ],
    defaultCategory: 'tournament',
    participationMode: 'participate',
  });
}
