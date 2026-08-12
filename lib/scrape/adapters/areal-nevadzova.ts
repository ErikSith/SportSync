import { scrapeTextListing } from '@/lib/scrape/adapters/_text-listing';
import type { AdapterResult } from '@/lib/scrape/types';
import { canonicalScrapeSport } from '@/lib/scrape/sources';

export async function scrapeArealNevadzova(): Promise<AdapterResult> {
  return scrapeTextListing({
    source: 'areal-nevadzova',
    sport: canonicalScrapeSport('FOOTBALL'),
    venueKey: 'areal-nevadzova',
    urls: [
      'https://www.arealnevadzova.sk/',
      'https://www.arealnevadzova.sk/aktuality/',
      'https://www.arealnevadzova.sk/podujatia/',
    ],
    defaultCategory: 'match',
    participationMode: 'participate',
  });
}
