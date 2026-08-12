import * as cheerio from 'cheerio';
import { resolveSportType } from '@/lib/ai/theme-config';
import {
  errResult,
  fetchHtml,
  okResult,
  parseSlovakDate,
  parseTimeOnDate,
  slugify,
} from '@/lib/scrape/fetch';
import type { AdapterResult, NormalizedScrapedEvent } from '@/lib/scrape/types';

const TURNAJE_URL = 'https://aurialpadel.sk/turnaje';

/**
 * Aurial Padel Bratislava tournaments (text-only — no venue photos).
 */
export async function scrapeAurialPadel(): Promise<AdapterResult> {
  try {
    const html = await fetchHtml(TURNAJE_URL);
    const $ = cheerio.load(html);
    const events: NormalizedScrapedEvent[] = [];
    const seen = new Set<string>();
    const dateByHref = new Map<string, Date>();
    let currentDate: Date | null = null;

    $('body')
      .find('h3, h4, h5, h6, strong, .card-title, a[href*="/tournament/"]')
      .each((_, el) => {
        const tag = 'name' in el ? String(el.name).toLowerCase() : '';
        const text = $(el).text().replace(/\s+/g, ' ').trim();

        if (tag !== 'a') {
          const dateMatch = text.match(/(\d{1,2}\.\d{1,2}\.\d{4})/);
          if (dateMatch?.[1] && text.length < 80) {
            currentDate = parseSlovakDate(dateMatch[1]);
          }
          return;
        }

        const hrefRaw = $(el).attr('href');
        if (!hrefRaw || !/\/tournament\//i.test(hrefRaw)) return;
        const href = absoluteUrl(hrefRaw);
        if (currentDate && !dateByHref.has(href)) {
          dateByHref.set(href, currentDate);
        }
      });

    $('a[href*="/tournament/"]').each((_, el) => {
      const href = absoluteUrl($(el).attr('href') ?? '');
      if (!href || seen.has(href)) return;

      const card = $(el).closest('.card, .row, article, [class*="activity"]');
      const scope = card.length ? card : $(el).parent().parent();
      const text = scope.text().replace(/\s+/g, ' ').trim();
      if (!text || text.length < 10) return;

      const title =
        scope.find('h5, .card-title, h4').first().text().replace(/\s+/g, ' ').trim() ||
        $(el).text().replace(/\s+/g, ' ').trim();
      if (!title || title.length < 4 || /^(zobraziť|registrovať)/i.test(title)) return;

      const startsAt = resolveStartsAt(href, text, dateByHref.get(href) ?? null);
      if (!startsAt) return;

      const timeMatch = text.match(/\b(\d{1,2}:\d{2})\b/);
      const withTime = parseTimeOnDate(startsAt, timeMatch?.[1] ?? '10:00');

      const priceMatch = text.match(/(\d+)[,.](\d{2})\s*€/);
      const priceCents = priceMatch
        ? Number(priceMatch[1]) * 100 + Number(priceMatch[2])
        : 5000;

      const capMatch = text.match(/(\d+)\s*\/\s*(\d+)/);
      const registeredCount = capMatch ? Number(capMatch[1]) : 0;
      const capacity = capMatch ? Number(capMatch[2]) : 8;

      const venueKey = /ra[cč]i|na p[aá]ntoch|arena padel/i.test(text + title)
        ? 'aurial-padel-raca'
        : 'aurial-padel';

      const externalId = slugify(href.replace(/^https?:\/\//, ''));
      seen.add(href);

      events.push({
        source: 'aurial-padel',
        externalId,
        title: title.slice(0, 120),
        sport: 'PADEL',
        sportType: resolveSportType('PADEL'),
        category: 'tournament',
        participationMode: 'participate',
        startsAt: withTime,
        city: 'Bratislava',
        venueKey,
        description: buildDescription(title, text, capacity, registeredCount, priceCents),
        coverUrl: null,
        sourceUrl: href,
        ticketUrl: href,
        priceCents: /pln[eé]/i.test(text) && !priceMatch ? 5000 : priceCents,
        capacity,
        registeredCount,
      });
    });

    return okResult('aurial-padel', events.slice(0, 40));
  } catch (error) {
    return errResult('aurial-padel', error);
  }
}

/** @deprecated Prefer scrapeAurialPadel — kept for legacy source id in DB. */
export async function scrapeArenaPadel(): Promise<AdapterResult> {
  const result = await scrapeAurialPadel();
  return {
    ...result,
    source: 'arena-padel',
    events: result.events.map((e) => ({ ...e, source: 'arena-padel' as const })),
  };
}

function resolveStartsAt(href: string, text: string, sectionDate: Date | null): Date | null {
  const fromUrl = href.match(/-(\d{2})(\d{2})(\d{4})\/?$/);
  if (fromUrl) {
    const day = Number(fromUrl[1]);
    const month = Number(fromUrl[2]);
    const year = Number(fromUrl[3]);
    return new Date(Date.UTC(year, month - 1, day, 10, 0, 0));
  }

  const fromText = text.match(/(\d{1,2}\.\d{1,2}\.\d{4})/);
  if (fromText?.[1]) return parseSlovakDate(fromText[1]);
  return sectionDate;
}

function buildDescription(
  title: string,
  text: string,
  capacity: number,
  registered: number,
  priceCents: number,
): string {
  const fee = (priceCents / 100).toFixed(priceCents % 100 === 0 ? 0 : 2);
  const spots = `${registered}/${capacity}`;
  const venue = /ra[cč]i/i.test(text + title)
    ? 'Aurial Padel Rača'
    : 'Aurial Padel Bratislava (Bajkalská 7)';
  return `Padel Knock Out turnaj — ${title}. Kapacita ${spots}, štartovné ${fee} €. ${venue}. Registrácia: aurialpadel.sk`;
}

function absoluteUrl(href: string): string {
  try {
    return new URL(href, 'https://aurialpadel.sk/').toString();
  } catch {
    return href;
  }
}
