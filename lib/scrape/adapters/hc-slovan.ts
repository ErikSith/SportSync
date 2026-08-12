import * as cheerio from 'cheerio';
import { errResult, fetchHtml, okResult, parseSlovakDate, parseTimeOnDate, slugify } from '@/lib/scrape/fetch';
import type { AdapterResult, NormalizedScrapedEvent } from '@/lib/scrape/types';

const URL = 'https://www.hcslovan.sk/';

export async function scrapeHcSlovan(): Promise<AdapterResult> {
  try {
    const html = await fetchHtml(URL);
    const $ = cheerio.load(html);
    const events: NormalizedScrapedEvent[] = [];
    const seen = new Set<string>();

    $('a, article, .match, .game, li, tr').each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (text.length < 10 || text.length > 280) return;
      if (!/slovan|hokej|extraliga|tipsport/i.test(text)) return;

      const dateMatch = text.match(/(\d{1,2}[.\-/]\d{1,2}(?:[.\-/]\d{2,4})?|\d{1,2}\.?\s*[A-Za-záäčďéíľĺňóôŕšťúýž]+\s*\d{0,4})/);
      if (!dateMatch?.[1]) return;
      let startsBase = parseSlovakDate(dateMatch[1]);
      if (!startsBase) {
        // dd.mm without year — assume current/next season year
        const m = dateMatch[1].match(/(\d{1,2})[.\-/](\d{1,2})/);
        if (!m?.[1] || !m[2]) return;
        const year = new Date().getFullYear();
        startsBase = new Date(Date.UTC(year, Number(m[2]) - 1, Number(m[1]), 17, 0, 0));
        if (startsBase.getTime() < Date.now() - 7 * 86400000) {
          startsBase = new Date(Date.UTC(year + 1, Number(m[2]) - 1, Number(m[1]), 17, 0, 0));
        }
      }

      const timeMatch = text.match(/\b(\d{1,2}[:.]\d{2})\b/);
      const startsAt = parseTimeOnDate(startsBase, timeMatch?.[1] ?? '18:00');

      const title = text.slice(0, 100) || `HC Slovan — ${dateMatch[1]}`;
      if (/permanentk|v predaji|eshop|vstupenk/i.test(title)) return;
      if (startsAt.getTime() > Date.now() + 366 * 86400000) return;
      const externalId = `${startsAt.toISOString().slice(0, 10)}-${slugify(title)}`;
      if (seen.has(externalId)) return;
      seen.add(externalId);

      events.push({
        source: 'hc-slovan',
        externalId,
        title,
        sport: 'HOCKEY',
        sportType: 'OTHER',
        category: 'match',
        participationMode: 'spectator',
        startsAt,
        city: 'Bratislava',
        venueKey: 'tipos-arena',
        description: 'Hokejový zápas HC Slovan — vstup ako divák.',
        sourceUrl: URL,
        ticketUrl: URL,
      });
    });

    // No invented fixtures
    return okResult('hc-slovan', events.slice(0, 20));
  } catch (error) {
    return errResult('hc-slovan', error);
  }
}
