import { scrapeTextListing } from '@/lib/scrape/adapters/_text-listing';
import type { AdapterResult } from '@/lib/scrape/types';
import { canonicalScrapeSport } from '@/lib/scrape/sources';

export async function scrapeProstor(): Promise<AdapterResult> {
  return scrapeTextListing({
    source: 'prostor',
    sport: canonicalScrapeSport('FITNESS'),
    venueKey: 'prostor',
    urls: ['https://www.prostor.sk/', 'https://www.prostor.sk/rozvrh/', 'https://www.prostor.sk/eventy/'],
    defaultCategory: 'fitness',
    participationMode: 'participate',
  });
}
