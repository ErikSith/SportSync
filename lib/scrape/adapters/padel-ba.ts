import { scrapeTextListing } from '@/lib/scrape/adapters/_text-listing';
import type { AdapterResult } from '@/lib/scrape/types';
import { canonicalScrapeSport } from '@/lib/scrape/sources';

/**
 * Padel Bratislava / Arena Padel portal.
 * padelbratislava.sk currently fails TLS from our egress — use arenapadel.sk.
 * Live dated tournaments also come from aurial-padel.
 */
export async function scrapePadelBa(): Promise<AdapterResult> {
  return scrapeTextListing({
    source: 'padel-ba',
    sport: canonicalScrapeSport('PADEL'),
    venueKey: 'padel-ba',
    urls: [
      'https://arenapadel.sk/',
      'https://arenapadel.sk/turnaje/',
      'https://arenapadel.sk/category/arena-padel-bratislava/',
    ],
    defaultCategory: 'tournament',
    participationMode: 'participate',
  });
}
