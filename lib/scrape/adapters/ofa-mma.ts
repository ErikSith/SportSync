import { scrapeTextListing } from '@/lib/scrape/adapters/_text-listing';
import { extractWeeklyTablesFromHtml } from '@/lib/scrape/adapters/_weekly-schedule';
import { errResult, fetchHtml, truncateHtmlForParse } from '@/lib/scrape/fetch';
import type { AdapterResult } from '@/lib/scrape/types';
import { canonicalScrapeSport } from '@/lib/scrape/sources';

const ROZPIS_URL = 'https://www.ofa-gym.sk/o-gyme/';
const HOME_URL = 'https://www.ofa-gym.sk/';

/**
 * OFA Octagon Fighting Academy — weekly class grid on ofa-gym.sk
 * (ofa.sk/rozvrh is a dead 404; do not scrape it).
 */
export async function scrapeOfaMma(): Promise<AdapterResult> {
  try {
    const html = await fetchHtml(ROZPIS_URL);
    const classes = extractWeeklyTablesFromHtml(truncateHtmlForParse(html), {
      source: 'ofa-mma',
      venueKey: 'ofa-mma',
      sourceUrl: ROZPIS_URL,
      sportFallback: canonicalScrapeSport('MARTIAL_ARTS'),
      category: 'fitness',
      participationMode: 'participate',
      idPrefix: 'ofa',
      weeks: 1,
    });

    if (classes.length > 0) {
      return { source: 'ofa-mma', events: classes.slice(0, 80) };
    }

    // Dated news/events only — never invent a rozvrh from homepage prose.
    return scrapeTextListing({
      source: 'ofa-mma',
      sport: canonicalScrapeSport('MARTIAL_ARTS'),
      venueKey: 'ofa-mma',
      urls: [HOME_URL],
      defaultCategory: 'fitness',
      participationMode: 'participate',
      maxEvents: 15,
    });
  } catch (error) {
    return errResult('ofa-mma', error);
  }
}
