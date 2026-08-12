import { scrapeTextListing } from '@/lib/scrape/adapters/_text-listing';
import { okResult } from '@/lib/scrape/fetch';
import type { AdapterResult } from '@/lib/scrape/types';
import { canonicalScrapeSport } from '@/lib/scrape/sources';

/**
 * NTC hosts tennis *and* concerts/shows. Keep only sport-shaped listings —
 * concerts like Horkýže Slíže / Sarah Brightman must not become TENNIS tournaments.
 */
function isNtcSportCandidate(title: string, description?: string): boolean {
  const hay = `${title} ${description ?? ''}`;

  if (
    /koncert|concert|\btour\b|k-?pop|greatest\s+hits|\bband\b|live\s+show|musical|opera|divadlo|stand-?up|comedy|brightman|hork[yý][zž]e|al\s*bano|fever\b/i.test(
      hay,
    )
  ) {
    return false;
  }

  return /tenis|tennis|turnaj|tournament|davis|fed\s*cup|itf|wtt|tejt|padel|squash|junior|majstrovst|dru[zž]st|open\b|cup\b|trophy|liga/i.test(
    hay,
  );
}

export async function scrapeNtcBa(): Promise<AdapterResult> {
  const result = await scrapeTextListing({
    source: 'ntc-ba',
    sport: canonicalScrapeSport('TENNIS'),
    venueKey: 'ntc-bratislava',
    urls: ['https://www.ntc.sk/', 'https://www.ntc.sk/aktuality/', 'https://www.ntc.sk/podujatia/'],
    defaultCategory: 'tournament',
    participationMode: 'participate',
  });

  if (result.error) return result;

  const sportOnly = result.events.filter((event) =>
    isNtcSportCandidate(event.title, event.description),
  );

  return okResult('ntc-ba', sportOnly);
}
