import { scrapeTextListing } from '@/lib/scrape/adapters/_text-listing';
import type { AdapterResult } from '@/lib/scrape/types';
import { canonicalScrapeSport } from '@/lib/scrape/sources';

export async function scrapeStupavaTrophy(): Promise<AdapterResult> {
  return scrapeTextListing({
    source: 'stupava-trophy',
    sport: canonicalScrapeSport('RUNNING'),
    venueKey: 'stupava-trophy',
    city: 'Stupava',
    urls: ['https://www.stupavatrophy.sk/', 'https://www.stupavatrophy.sk/registracia/'],
    defaultCategory: 'tournament',
    participationMode: 'participate',
  });
}
