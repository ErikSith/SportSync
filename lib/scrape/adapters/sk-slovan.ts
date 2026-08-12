import * as cheerio from 'cheerio';
import { errResult, fetchHtml, okResult, parseSlovakDate, parseTimeOnDate, slugify } from '@/lib/scrape/fetch';
import type { AdapterResult, NormalizedScrapedEvent } from '@/lib/scrape/types';

const URL = 'https://www.skslovan.com/zapasy/?liga=FL';

function isHomeMatch(text: string): boolean {
  // Prefer home fixtures at Tehelné pole / ŠK Slovan listed first as home
  const lower = text.toLowerCase();
  if (lower.includes('teheln')) return true;
  // Rows often: opponent | score | Slovan or Slovan | score | opponent
  // Treat as home if "ŠK Slovan" / "Slovan" appears before "vs" style away markers
  return /[šs]k\s*slovan|slovan bratislava/i.test(text);
}

export async function scrapeSkSlovan(): Promise<AdapterResult> {
  try {
    const html = await fetchHtml(URL);
    const $ = cheerio.load(html);
    const events: NormalizedScrapedEvent[] = [];
    const seen = new Set<string>();

    $('table tr, .zapas, .match, article, li').each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (text.length < 12 || text.length > 400) return;
      if (!/slovan/i.test(text)) return;
      if (!/\d{1,2}[.\-/]\d{1,2}|\d{1,2}\.?\s*(jan|feb|mar|apr|m[aá]j|j[uú]n|j[uú]l|aug|sep|okt|nov|dec)/i.test(text)) {
        return;
      }

      const dateMatch = text.match(/(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}|\d{1,2}\.?\s*[A-Za-záäčďéíľĺňóôŕšťúýžÁÄČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ]+\s*\d{0,4})/);
      if (!dateMatch?.[1]) return;
      const startsBase = parseSlovakDate(dateMatch[1]);
      if (!startsBase) return;

      const timeMatch = text.match(/\b(\d{1,2}[:.]\d{2})\b/);
      const startsAt = parseTimeOnDate(startsBase, timeMatch?.[1]);

      // Skip obvious away if venue city elsewhere and not Bratislava home wording
      const awayHint = /b\.\s*bystrica|podbrezov|trnava|nitra|žilina|zilina|tren[cč][ií]n|michalovce|ružomberok|ruzomberok|skalica|dac|tbilisi|mjällby|mjallby/i.test(
        text,
      );
      const homeHint = isHomeMatch(text) || /teheln|bratislava/i.test(text);
      if (awayHint && !homeHint && !/teheln/i.test(text)) {
        // Keep only if Slovan listed as home side near start
        const idx = text.toLowerCase().indexOf('slovan');
        if (idx > 40) return;
      }

      let title = text
        .replace(dateMatch[0], '')
        .replace(timeMatch?.[0] ?? '', '')
        .replace(/\s{2,}/g, ' ')
        .trim()
        .slice(0, 120);
      if (!title || title.length < 6) {
        title = `ŠK Slovan Bratislava — ${dateMatch[1]}`;
      }
      // Reject garbled scrapes (ticket CTAs, month fragments without real fixture)
      if (/^[.\s]|vstupenk|buy tickets|info on tickets|kúpiť vstupenky/i.test(title)) return;
      if (!/\d{4}/.test(dateMatch[1]) && !parseSlovakDate(dateMatch[1])) return;
      // Only keep fixtures within the next 12 months
      if (startsAt.getTime() > Date.now() + 366 * 86400000) return;

      const externalId = `${startsAt.toISOString().slice(0, 10)}-${slugify(title)}`;
      if (seen.has(externalId)) return;
      seen.add(externalId);

      events.push({
        source: 'sk-slovan',
        externalId,
        title,
        sport: 'FOOTBALL',
        sportType: 'FOOTBALL',
        category: 'match',
        participationMode: 'spectator',
        startsAt,
        city: 'Bratislava',
        venueKey: 'tehelne-pole',
        description: `Futbalový zápas — vstup ako divák. Zdroj: skslovan.com`,
        sourceUrl: URL,
        ticketUrl: 'https://www.skslovan.com/',
      });
    });

    // No invented fixtures — only what we parse from the live page
    return okResult('sk-slovan', events.slice(0, 25));
  } catch (error) {
    return errResult('sk-slovan', error);
  }
}
