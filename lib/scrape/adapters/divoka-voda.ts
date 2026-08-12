import { scrapeTextListing } from '@/lib/scrape/adapters/_text-listing';
import type { AdapterResult } from '@/lib/scrape/types';
import { canonicalScrapeSport } from '@/lib/scrape/sources';

export async function scrapeDivokaVoda(): Promise<AdapterResult> {
  return scrapeTextListing({
    source: 'divoka-voda',
    sport: canonicalScrapeSport('WATER_SPORTS'),
    venueKey: 'divoka-voda',
    urls: [
      'https://www.divokavoda.sk/',
      'https://www.divokavoda.sk/podujatia/',
      'https://www.divokavoda.sk/aktuality/',
    ],
    defaultCategory: 'fitness',
    participationMode: 'participate',
  });
}
