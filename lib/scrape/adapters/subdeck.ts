import * as cheerio from 'cheerio';
import { errResult, fetchHtml, okResult, parseSlovakDate, parseTimeOnDate, slugify } from '@/lib/scrape/fetch';
import type { AdapterResult, NormalizedScrapedEvent } from '@/lib/scrape/types';

const URLS = ['https://subdeck.sk/events', 'https://subdeck.sk/', 'https://goout.net/sk/subdeck/vzewtf/'];

export async function scrapeSubdeck(): Promise<AdapterResult> {
  const events: NormalizedScrapedEvent[] = [];
  const seen = new Set<string>();
  let lastError: string | undefined;

  for (const url of URLS) {
    try {
      const html = await fetchHtml(url);
      const $ = cheerio.load(html);

      $('a, article, h1, h2, h3, .event').each((_, el) => {
        const text = $(el).text().replace(/\s+/g, ' ').trim();
        if (text.length < 4 || text.length > 160) return;
        if (/loading|menu|tickets|info|sundeck|cookie/i.test(text) && text.length < 20) return;

        const href = $(el).attr('href') ?? '';
        const combined = `${text} ${href}`;
        const dateMatch = combined.match(/(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}|\d{1,2}\.?\s*[A-Za-z]+\s*\d{4})/);
        let startsAt: Date | null = dateMatch?.[1] ? parseSlovakDate(dateMatch[1]) : null;
        if (!startsAt && href.includes('#')) {
          // hash slug only — invent next Friday nightlife slot from title uniqueness
          return;
        }
        if (!startsAt) return;

        const title = text.slice(0, 100);
        const externalId = `${startsAt.toISOString().slice(0, 10)}-${slugify(title)}`;
        if (seen.has(externalId)) return;
        seen.add(externalId);

        events.push({
          source: 'subdeck',
          externalId,
          title,
          sport: 'NIGHTLIFE',
          sportType: 'OTHER',
          category: 'nightlife',
          participationMode: 'spectator',
          startsAt: parseTimeOnDate(startsAt, '22:00'),
          city: 'Bratislava',
          venueKey: 'subdeck',
          description: 'Subdeck klubová noc — vstup ako návštevník.',
          sourceUrl: url,
          ticketUrl: 'https://goout.net/sk/subdeck/vzewtf/',
        });
      });

      if (events.length > 0) break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  if (events.length === 0 && lastError) return errResult('subdeck', lastError);
  // No invented club nights — empty is OK when the site has nothing parseable
  return okResult('subdeck', events.slice(0, 15));
}
