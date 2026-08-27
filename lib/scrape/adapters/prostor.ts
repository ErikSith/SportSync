import { extractWeeklyTablesFromHtml } from '@/lib/scrape/adapters/_weekly-schedule';
import { errResult, fetchHtml, truncateHtmlForParse } from '@/lib/scrape/fetch';
import type { AdapterResult } from '@/lib/scrape/types';
import { canonicalScrapeSport } from '@/lib/scrape/sources';

/**
 * CrossFit Proton (historicky seedovaný ako `prostor`).
 * www.prostor.sk is an unrelated consulting firm — never scrape it for classes.
 */
const ROZVRH_URL = 'https://www.crossfitproton.sk/rozvrh/';

export async function scrapeProstor(): Promise<AdapterResult> {
  try {
    const html = await fetchHtml(ROZVRH_URL);
    const classes = extractWeeklyTablesFromHtml(truncateHtmlForParse(html), {
      source: 'prostor',
      venueKey: 'prostor',
      sourceUrl: ROZVRH_URL,
      sportFallback: canonicalScrapeSport('FITNESS'),
      category: 'fitness',
      participationMode: 'participate',
      idPrefix: 'proton',
      weeks: 1,
    });

    if (classes.length === 0) {
      return {
        source: 'prostor',
        events: [],
        error: 'CrossFit Proton rozvrh table not found or empty',
      };
    }

    return { source: 'prostor', events: classes.slice(0, 100) };
  } catch (error) {
    return errResult('prostor', error);
  }
}
