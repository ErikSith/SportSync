import { scrapeTextListing } from '@/lib/scrape/adapters/_text-listing';
import type { AdapterResult } from '@/lib/scrape/types';
import { canonicalScrapeSport } from '@/lib/scrape/sources';

/** Bowlingové Národné Centrum — live domain is bnc-sk.sk (bnc.sk times out). */
export async function scrapeBncBa(): Promise<AdapterResult> {
  return scrapeTextListing({
    source: 'bnc-ba',
    sport: canonicalScrapeSport('BOWLING'),
    venueKey: 'bnc-ba',
    urls: [
      'https://www.bnc-sk.sk/',
      'https://www.bnc-sk.sk/bowling',
      'https://www.bnc-sk.sk/novinky',
    ],
    defaultCategory: 'tournament',
    participationMode: 'participate',
  });
}
