import { scrapeTextListing } from '@/lib/scrape/adapters/_text-listing';
import type { AdapterResult } from '@/lib/scrape/types';
import { canonicalScrapeSport } from '@/lib/scrape/sources';

export async function scrapeSipkySk(): Promise<AdapterResult> {
  return scrapeTextListing({
    source: 'sipky-sk',
    sport: canonicalScrapeSport('DARTS'),
    venueKey: 'sipky-sk',
    urls: ['https://www.sipky.sk/', 'https://www.sipky.sk/sutaze/', 'https://www.sipky.sk/aktuality/'],
    defaultCategory: 'tournament',
    participationMode: 'participate',
  });
}
