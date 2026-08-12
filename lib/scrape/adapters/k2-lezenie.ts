import { scrapeTextListing } from '@/lib/scrape/adapters/_text-listing';
import type { AdapterResult } from '@/lib/scrape/types';
import { canonicalScrapeSport } from '@/lib/scrape/sources';

export async function scrapeK2Lezenie(): Promise<AdapterResult> {
  return scrapeTextListing({
    source: 'k2-lezenie',
    sport: canonicalScrapeSport('CLIMBING'),
    venueKey: 'k2-lezenie',
    urls: [
      'https://www.lezeckastena.sk/',
      'https://www.lezeckastena.sk/kurzy/',
      'https://www.lezeckastena.sk/aktuality/',
    ],
    defaultCategory: 'fitness',
    participationMode: 'participate',
  });
}
