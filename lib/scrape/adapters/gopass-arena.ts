import * as cheerio from 'cheerio';
import { errResult, fetchHtml, okResult, parseSlovakDate, parseTimeOnDate, slugify } from '@/lib/scrape/fetch';
import type { AdapterResult, NormalizedScrapedEvent } from '@/lib/scrape/types';

const URL = 'https://gopassarena.sk/';

export async function scrapeGopassArena(): Promise<AdapterResult> {
  try {
    const html = await fetchHtml(URL);
    const $ = cheerio.load(html);
    const events: NormalizedScrapedEvent[] = [];
    const seen = new Set<string>();

    $('a, article, .event, h3, h2').each((_, el) => {
      const $el = $(el);
      const text = $el.text().replace(/\s+/g, ' ').trim();
      if (text.length < 8 || text.length > 200) return;

      const isSport =
        /sport|basket|volej|slovan|eurobasket|challenge cup|bc\s|vk\s/i.test(text) ||
        $el.closest('[class*="sport" i]').length > 0;
      if (!isSport && !/basket|volej|eurobasket|challenge/i.test(text)) return;

      const dateMatch = text.match(
        /(\d{1,2}\.?\s*(jan|feb|mar|apr|m[aá]j|j[uú]n|j[uú]l|aug|sep|okt|nov|dec)[a-z]*\.?\s*\d{0,4}|\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}|[A-Z][a-z]{2}\s+\d{1,2})/i,
      );
      // Also look at siblings
      const parentText = $el.parent().text().replace(/\s+/g, ' ');
      const combined = `${text} ${parentText}`;
      const dm =
        dateMatch ??
        combined.match(/(\d{1,2}\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s*\d{0,4}|\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}|[A-Z][a-z]{2}\s+\d{1,2})/i);

      let startsAt: Date | null = null;
      if (dm?.[1]) {
        startsAt = parseSlovakDate(dm[1]);
        if (!startsAt) {
          const en = Date.parse(dm[1]);
          if (!Number.isNaN(en)) startsAt = new Date(en);
        }
      }
      if (!startsAt) return;

      const title = text.slice(0, 120);
      const externalId = `${startsAt.toISOString().slice(0, 10)}-${slugify(title)}`;
      if (seen.has(externalId)) return;
      seen.add(externalId);

      const sport = /volej|vk\s/i.test(combined) ? 'VOLLEYBALL' : 'BASKETBALL';

      events.push({
        source: 'gopass-arena',
        externalId,
        title,
        sport,
        sportType: sport === 'BASKETBALL' ? 'BASKETBALL' : 'OTHER',
        category: 'match',
        participationMode: 'spectator',
        startsAt: parseTimeOnDate(startsAt, '19:00'),
        city: 'Bratislava',
        venueKey: 'gopass-arena',
        description: 'Športové podujatie v Gopass Aréne — vstup ako divák.',
        sourceUrl: URL,
        ticketUrl: URL,
      });
    });

    // No invented fixtures
    return okResult('gopass-arena', events.slice(0, 20));
  } catch (error) {
    return errResult('gopass-arena', error);
  }
}
