import { scrapeTextListing } from '@/lib/scrape/adapters/_text-listing';
import type { AdapterResult } from '@/lib/scrape/types';
import { canonicalScrapeSport } from '@/lib/scrape/sources';

export async function scrapePadelBa(): Promise<AdapterResult> {
  return scrapeTextListing({
    source: 'padel-ba',
    sport: canonicalScrapeSport('PADEL'),
    venueKey: 'padel-ba',
    urls: [
      'https://www.padelbratislava.sk/',
      'https://www.padelbratislava.sk/turnaje/',
      'https://www.padelbratislava.sk/eventy/',
    ],
    defaultCategory: 'tournament',
    participationMode: 'participate',
  });
}
