import * as cheerio from 'cheerio';
import { resolveSportType } from '@/lib/ai/theme-config';
import { detectEventSport, isEventSport } from '@/lib/constants/sports';
import {
  errResult,
  fetchHtml,
  MAX_LOOP_ITERATIONS,
  okResult,
  parsePriceCents,
  parseSlovakDate,
  parseTimeOnDate,
  slugify,
  truncateHtmlForParse,
  withUrlProcessingTimeout,
} from '@/lib/scrape/fetch';
import { scrapingSourceByAdapter } from '@/lib/scrape/scraping-sources';
import { tagScrapedListingAudience } from '@/lib/events/audience';
import { tagScrapedEventLocation } from '@/lib/scrape/tag-location';
import type {
  AdapterResult,
  NormalizedScrapedEvent,
  ParticipationMode,
  ScrapeAdapterId,
  ScrapeCategory,
} from '@/lib/scrape/types';

export interface TextListingConfig {
  source: ScrapeAdapterId;
  sport: string;
  venueKey: string;
  city?: string;
  urls: string[];
  /** Default category when heuristics do not match. */
  defaultCategory?: ScrapeCategory;
  participationMode?: ParticipationMode;
  maxEvents?: number;
}

/**
 * Dated listing extractor for news / tournament / event pages.
 * NOT for weekly studio rozvrh grids — use `_weekly-schedule.ts` instead.
 * Collects Event JSON-LD + dated headings/links. Never reads img / og:image.
 * Always retains `upcoming` only (one-off dated listings).
 */
export async function scrapeTextListing(config: TextListingConfig): Promise<AdapterResult> {
  try {
    const events: NormalizedScrapedEvent[] = [];
    const seen = new Set<string>();

    for (const url of config.urls) {
      try {
        await withUrlProcessingTimeout(url, async () => {
          let html: string;
          try {
            html = await fetchHtml(url);
          } catch (err) {
            // Path may 404 on some venues — continue with other URLs
            console.warn(
              `[scrape.${config.source}] skip ${url}:`,
              err instanceof Error ? err.message : err,
            );
            return;
          }
          const fromLd = extractJsonLdEvents(html, url, config);
          const fromDom = extractDomEvents(html, url, config);
          let mergePasses = 0;
          for (const event of [...fromLd, ...fromDom]) {
            if (++mergePasses > MAX_LOOP_ITERATIONS) {
              console.warn(`[scrape.${config.source}] merge loop safety break for ${url}`);
              break;
            }
            if (seen.has(event.externalId)) continue;
            seen.add(event.externalId);
            events.push(
              tagScrapedListingAudience(tagScrapedEventLocation(withSourceLocation(event, config))),
            );
          }
        });
      } catch (err) {
        console.warn(
          `[scrape.${config.source}] skip ${url}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    return okResult(config.source, events.slice(0, config.maxEvents ?? 40));
  } catch (error) {
    return errResult(config.source, error);
  }
}

function extractJsonLdEvents(
  html: string,
  pageUrl: string,
  config: TextListingConfig,
): NormalizedScrapedEvent[] {
  const $ = cheerio.load(truncateHtmlForParse(html));
  const out: NormalizedScrapedEvent[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html();
    if (!raw) return;
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    const nodes = flattenLd(data);
    let nodePasses = 0;
    for (const node of nodes) {
      if (++nodePasses > MAX_LOOP_ITERATIONS) {
        console.warn(`[scrape.${config.source}] JSON-LD node loop safety break`);
        break;
      }
      if (!node || typeof node !== 'object') continue;
      const obj = node as Record<string, unknown>;
      const type = String(obj['@type'] ?? '');
      if (!/Event|SportsEvent|Festival|Competition/i.test(type)) continue;

      const title = cleanListingTitle(String(obj.name ?? obj.headline ?? '').trim());
      if (!title || title.length < 3) continue;

      const startRaw = String(obj.startDate ?? obj.startTime ?? '');
      let startsAt = startRaw ? new Date(startRaw) : null;
      if (!startsAt || Number.isNaN(startsAt.getTime())) {
        startsAt = parseSlovakDate(startRaw);
      }
      if (!startsAt || !isUpcomingListingDate(startsAt)) continue;

      const desc = String(obj.description ?? '').slice(0, 400);
      const loc =
        typeof obj.location === 'object' && obj.location
          ? String((obj.location as { name?: string }).name ?? '')
          : String(obj.location ?? '');
      const offer =
        typeof obj.offers === 'object' && obj.offers
          ? (obj.offers as { price?: string | number })
          : null;
      const priceCents =
        offer?.price !== undefined
          ? Math.round(Number(offer.price) * 100)
          : parsePriceCents(`${title} ${desc}`);

      const href = String(obj.url ?? pageUrl);
      const externalId = slugify(`${config.source}-${href}-${startsAt.toISOString().slice(0, 10)}`);
      const sport = resolveListingSport(title, config.sport);

      out.push({
        source: config.source,
        externalId,
        title: title.slice(0, 120),
        sport,
        sportType: resolveSportType(sport),
        category: classifyCategory(title, desc, config.defaultCategory ?? 'fitness'),
        participationMode: config.participationMode ?? 'participate',
        startsAt,
        city: config.city ?? 'Bratislava',
        venueKey: config.venueKey,
        description: [desc, loc].filter(Boolean).join(' — ').slice(0, 400) || undefined,
        coverUrl: null,
        sourceUrl: href.startsWith('http') ? href : pageUrl,
        ticketUrl: href.startsWith('http') ? href : pageUrl,
        priceCents,
      });
    }
  });

  return out;
}

function flattenLd(data: unknown, depth = 0): unknown[] {
  if (depth > MAX_LOOP_ITERATIONS) {
    console.warn('[scrape.text-listing] flattenLd depth safety break');
    return [];
  }
  if (Array.isArray(data)) return data.flatMap((item) => flattenLd(item, depth + 1));
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj['@graph'])) return flattenLd(obj['@graph'], depth + 1);
    return [data];
  }
  return [];
}

function extractDomEvents(
  html: string,
  pageUrl: string,
  config: TextListingConfig,
): NormalizedScrapedEvent[] {
  const $ = cheerio.load(truncateHtmlForParse(html));
  const out: NormalizedScrapedEvent[] = [];
  const seen = new Set<string>();

  const DATE_RE =
    /(\d{1,2}\s*[.\-/]\s*\d{1,2}\s*[.\-/]\s*\d{2,4}|\d{1,2}\.\s*[a-záéíóúýžščťň]+\s*\d{4}|\d{4}-\d{2}-\d{2})/i;

  // Prefer semantic cards / articles / event blocks
  const selectors = [
    'article',
    '.event',
    '.events-item',
    '.event-item',
    '.card',
    '.tournament',
    '.turnaj',
    '[class*="event"]',
    'li',
  ];

  let selectorPasses = 0;
  for (const sel of selectors) {
    if (++selectorPasses > MAX_LOOP_ITERATIONS) {
      console.warn(`[scrape.${config.source}] DOM selector loop safety break`);
      break;
    }
    let elementPasses = 0;
    $(sel).each((_, el) => {
      if (++elementPasses > MAX_LOOP_ITERATIONS) return false;
      const $el = $(el);
      const text = $el.text().replace(/\s+/g, ' ').trim();
      if (!text || text.length < 12 || text.length > 1200) return;

      const dateMatch = text.match(DATE_RE);
      if (!dateMatch?.[1]) return;
      const startsAtBase = parseSlovakDate(dateMatch[1]);
      if (!startsAtBase) return;

      const timeMatch = text.match(/\b(\d{1,2}[:.]\d{2})\b/);
      const startsAt = parseTimeOnDate(startsAtBase, timeMatch?.[1] ?? null);
      if (!isUpcomingListingDate(startsAt)) return;

      const link = $el.find('a[href]').first();
      const hrefRaw = link.attr('href');
      const href = hrefRaw ? absoluteUrl(hrefRaw, pageUrl) : pageUrl;
      if (/vysledky|results\.aspx|kphb-2020/i.test(href)) return;

      const title = cleanListingTitle(
        $el.find('h1, h2, h3, h4, .title, .card-title').first().text().replace(/\s+/g, ' ').trim() ||
          link.text().replace(/\s+/g, ' ').trim() ||
          text.slice(0, 80).trim(),
      );
      if (!title || title.length < 3) return;
      if (/cookie|privacy|gdpr|newsletter|prihlás|login/i.test(title)) return;

      const externalId = slugify(
        `${config.source}-${href}-${startsAt.toISOString().slice(0, 10)}-${title}`,
      );
      if (seen.has(externalId)) return;
      seen.add(externalId);

      const priceCents = parsePriceCents(text);
      const sport = resolveListingSport(title, config.sport);
      out.push({
        source: config.source,
        externalId,
        title: title.slice(0, 120),
        sport,
        sportType: resolveSportType(sport),
        category: classifyCategory(title, text, config.defaultCategory ?? 'fitness'),
        participationMode: config.participationMode ?? 'participate',
        startsAt,
        city: config.city ?? 'Bratislava',
        venueKey: config.venueKey,
        description: text.slice(0, 320),
        coverUrl: null,
        sourceUrl: href,
        ticketUrl: href,
        priceCents,
      });
    });
    if (out.length >= (config.maxEvents ?? 40)) break;
  }

  // Fallback: links whose surrounding text contains a date
  if (out.length === 0) {
    let linkPasses = 0;
    $('a[href]').each((_, el) => {
      if (++linkPasses > MAX_LOOP_ITERATIONS) return false;
      const $a = $(el);
      const title = cleanListingTitle($a.text().replace(/\s+/g, ' ').trim());
      if (!title || title.length < 4 || title.length > 120) return;
      const parentText = $a.parent().text().replace(/\s+/g, ' ').trim();
      const dateMatch = parentText.match(DATE_RE) ?? title.match(DATE_RE);
      if (!dateMatch?.[1]) return;
      const startsAtBase = parseSlovakDate(dateMatch[1]);
      if (!startsAtBase || !isUpcomingListingDate(startsAtBase)) return;
      const href = absoluteUrl($a.attr('href') ?? '', pageUrl);
      const externalId = slugify(`${config.source}-${href}-${startsAtBase.toISOString().slice(0, 10)}`);
      if (seen.has(externalId)) return;
      seen.add(externalId);
      const sport = resolveListingSport(title, config.sport);
      out.push({
        source: config.source,
        externalId,
        title: title.slice(0, 120),
        sport,
        sportType: resolveSportType(sport),
        category: classifyCategory(title, parentText, config.defaultCategory ?? 'fitness'),
        participationMode: config.participationMode ?? 'participate',
        startsAt: startsAtBase,
        city: config.city ?? 'Bratislava',
        venueKey: config.venueKey,
        description: parentText.slice(0, 320),
        coverUrl: null,
        sourceUrl: href,
        ticketUrl: href,
        priceCents: parsePriceCents(parentText),
      });
    });
  }

  return out;
}

function withSourceLocation(
  event: NormalizedScrapedEvent,
  config: TextListingConfig,
): NormalizedScrapedEvent {
  const source = scrapingSourceByAdapter(config.source);
  const locationName = event.locationName ?? source?.name ?? config.venueKey;
  const address = event.address ?? '';
  return {
    ...event,
    title: cleanListingTitle(event.title),
    locationName,
    address,
    requiresAiGraphic: true,
    coverUrl: null,
  };
}

/** Keep titles as readable text — strip glued dates / "Dátum …" tails from listings. */
function cleanListingTitle(raw: string): string {
  let title = raw.replace(/\s+/g, ' ').trim();
  title = title.replace(/^\d{1,2}\s+\d{1,2}\s+/, '');
  title = title.replace(/^\d{1,2}\.\s*\d{1,2}\.\s*\d{2,4}\s*[–-]?\s*/i, '');
  title = title.replace(/^\d{4}-\d{2}-\d{2}\s+/, '');
  const datumCut = title.search(/\sDátum\b/i);
  if (datumCut > 8) title = title.slice(0, datumCut).trim();
  title = title.replace(/["']{2,}/g, '"').replace(/\s{2,}/g, ' ').trim();
  return title.slice(0, 90);
}

function isUpcomingListingDate(startsAt: Date): boolean {
  const t = startsAt.getTime();
  if (Number.isNaN(t)) return false;
  const now = Date.now();
  if (t < now - 36 * 60 * 60 * 1000) return false;
  if (t > now + 400 * 24 * 60 * 60 * 1000) return false;
  return true;
}

function resolveListingSport(title: string, fallback: string) {
  return detectEventSport(title, isEventSport(fallback) ? fallback : 'OTHER');
}

function classifyCategory(
  title: string,
  text: string,
  fallback: ScrapeCategory,
): ScrapeCategory {
  const hay = `${title} ${text}`.toLowerCase();
  if (/turnaj|tournament|cup|trophy|liga|championship|marat[oó]n|race|beh\b/i.test(hay)) {
    return 'tournament';
  }
  if (/zápas|match|vs\.|–\s*\d|fixture|rozpis/i.test(hay)) return 'match';
  if (/tréning|training|open\s*gym|wod|class|cvičen|joga|yoga|pilates/i.test(hay)) {
    return 'fitness';
  }
  return fallback;
}

function absoluteUrl(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}
