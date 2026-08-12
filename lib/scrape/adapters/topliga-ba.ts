import { scrapeTextListing } from '@/lib/scrape/adapters/_text-listing';
import type { AdapterResult } from '@/lib/scrape/types';
import { canonicalScrapeSport } from '@/lib/scrape/sources';

export async function scrapeTopligaBa(): Promise<AdapterResult> {
  return scrapeTextListing({
    source: 'topliga-ba',
    sport: canonicalScrapeSport('FOOTBALL'),
    venueKey: 'topliga-ba',
    urls: [
      'https://bratislava.topliga.sk/',
      'https://bratislava.topliga.sk/zapasy/',
      'https://bratislava.topliga.sk/rozpis/',
    ],
    defaultCategory: 'match',
    participationMode: 'participate',
  });
}
