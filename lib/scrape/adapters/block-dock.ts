import { scrapeTextListing } from '@/lib/scrape/adapters/_text-listing';
import type { AdapterResult } from '@/lib/scrape/types';
import { canonicalScrapeSport } from '@/lib/scrape/sources';

export async function scrapeBlockDock(): Promise<AdapterResult> {
  return scrapeTextListing({
    source: 'block-dock',
    sport: canonicalScrapeSport('CLIMBING'),
    venueKey: 'block-dock',
    urls: [
      'https://www.blockdock.sk/',
      'https://www.blockdock.sk/eventy/',
      'https://www.blockdock.sk/aktuality/',
    ],
    defaultCategory: 'fitness',
    participationMode: 'participate',
  });
}
