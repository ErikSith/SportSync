import { scrapeTextListing } from '@/lib/scrape/adapters/_text-listing';
import type { AdapterResult } from '@/lib/scrape/types';
import { canonicalScrapeSport } from '@/lib/scrape/sources';

export async function scrapePbcBowling(): Promise<AdapterResult> {
  return scrapeTextListing({
    source: 'pbc-bowling',
    sport: canonicalScrapeSport('BOWLING'),
    venueKey: 'pbc-bowling',
    urls: ['http://www.pbc.sk/', 'http://www.pbc.sk/turnaje/', 'http://www.pbc.sk/aktuality/'],
    defaultCategory: 'tournament',
    participationMode: 'participate',
  });
}
