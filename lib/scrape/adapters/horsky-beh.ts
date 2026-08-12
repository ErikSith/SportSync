import { scrapeTextListing } from '@/lib/scrape/adapters/_text-listing';
import type { AdapterResult } from '@/lib/scrape/types';
import { canonicalScrapeSport } from '@/lib/scrape/sources';

export async function scrapeHorskyBeh(): Promise<AdapterResult> {
  return scrapeTextListing({
    source: 'horsky-beh',
    sport: canonicalScrapeSport('RUNNING'),
    venueKey: 'horsky-beh',
    urls: ['https://www.horskybeh.sk/', 'https://www.horskybeh.sk/terminy/', 'https://www.horskybeh.sk/aktuality/'],
    defaultCategory: 'tournament',
    participationMode: 'participate',
  });
}
