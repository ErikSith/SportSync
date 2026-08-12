import { scrapeTextListing } from '@/lib/scrape/adapters/_text-listing';
import type { AdapterResult } from '@/lib/scrape/types';
import { canonicalScrapeSport } from '@/lib/scrape/sources';

export async function scrapeNivyZone(): Promise<AdapterResult> {
  return scrapeTextListing({
    source: 'nivy-zone',
    sport: canonicalScrapeSport('YOGA'),
    venueKey: 'nivy-zone',
    urls: ['https://nivy.com/', 'https://nivy.com/eventy/', 'https://nivy.com/zona/'],
    defaultCategory: 'fitness',
    participationMode: 'participate',
  });
}
