import { scrapeTextListing } from '@/lib/scrape/adapters/_text-listing';
import type { AdapterResult } from '@/lib/scrape/types';
import { canonicalScrapeSport } from '@/lib/scrape/sources';

export async function scrapeOfaMma(): Promise<AdapterResult> {
  return scrapeTextListing({
    source: 'ofa-mma',
    sport: canonicalScrapeSport('MARTIAL_ARTS'),
    venueKey: 'ofa-mma',
    urls: ['https://ofa.sk/', 'https://ofa.sk/rozvrh/', 'https://ofa.sk/eventy/'],
    defaultCategory: 'fitness',
    participationMode: 'participate',
  });
}
