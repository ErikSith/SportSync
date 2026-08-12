import { scrapeTextListing } from '@/lib/scrape/adapters/_text-listing';
import type { AdapterResult } from '@/lib/scrape/types';
import { canonicalScrapeSport } from '@/lib/scrape/sources';

export async function scrapeChaosMma(): Promise<AdapterResult> {
  return scrapeTextListing({
    source: 'chaos-mma',
    sport: canonicalScrapeSport('MARTIAL_ARTS'),
    venueKey: 'chaos-mma',
    urls: ['https://www.chaosgym.sk/', 'https://www.chaosgym.sk/rozvrh/', 'https://www.chaosgym.sk/novinky/'],
    defaultCategory: 'fitness',
    participationMode: 'participate',
  });
}
