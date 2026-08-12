import { scrapeTextListing } from '@/lib/scrape/adapters/_text-listing';
import type { AdapterResult } from '@/lib/scrape/types';
import { canonicalScrapeSport } from '@/lib/scrape/sources';

export async function scrapeBncBa(): Promise<AdapterResult> {
  return scrapeTextListing({
    source: 'bnc-ba',
    sport: canonicalScrapeSport('BOWLING'),
    venueKey: 'bnc-ba',
    urls: ['https://www.bnc.sk/', 'https://www.bnc.sk/turnaje/', 'https://www.bnc.sk/aktuality/'],
    defaultCategory: 'tournament',
    participationMode: 'participate',
  });
}
