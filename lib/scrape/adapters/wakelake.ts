import { scrapeTextListing } from '@/lib/scrape/adapters/_text-listing';
import type { AdapterResult } from '@/lib/scrape/types';
import { canonicalScrapeSport } from '@/lib/scrape/sources';

export async function scrapeWakelake(): Promise<AdapterResult> {
  return scrapeTextListing({
    source: 'wakelake',
    sport: canonicalScrapeSport('WATER_SPORTS'),
    venueKey: 'wakelake',
    urls: ['https://www.wakelake.sk/', 'https://www.wakelake.sk/eventy/', 'https://www.wakelake.sk/aktuality/'],
    defaultCategory: 'fitness',
    participationMode: 'participate',
  });
}
