import { scrapeTextListing } from '@/lib/scrape/adapters/_text-listing';
import type { AdapterResult } from '@/lib/scrape/types';
import { canonicalScrapeSport } from '@/lib/scrape/sources';

export async function scrapeBaMarathon(): Promise<AdapterResult> {
  return scrapeTextListing({
    source: 'ba-marathon',
    sport: canonicalScrapeSport('RUNNING'),
    venueKey: 'ba-marathon',
    urls: [
      'https://www.bratislavamarathon.com/',
      'https://www.bratislavamarathon.com/en/',
      'https://www.bratislavamarathon.com/registracia/',
    ],
    defaultCategory: 'tournament',
    participationMode: 'participate',
  });
}
