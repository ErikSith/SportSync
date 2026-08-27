import { scrapeTextListing } from '@/lib/scrape/adapters/_text-listing';
import type { AdapterResult } from '@/lib/scrape/types';
import { canonicalScrapeSport } from '@/lib/scrape/sources';

/**
 * Slovenská šípkarská federácia — oficial site is slovakiadart.sk.
 * sipky.sk is an e-shop (not the federation calendar).
 */
export async function scrapeSipkySk(): Promise<AdapterResult> {
  return scrapeTextListing({
    source: 'sipky-sk',
    sport: canonicalScrapeSport('DARTS'),
    venueKey: 'sipky-sk',
    urls: [
      'https://www.slovakiadart.sk/',
      'https://www.slovakiadart.sk/supersipky/',
    ],
    defaultCategory: 'tournament',
    participationMode: 'participate',
  });
}
