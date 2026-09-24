/**
 * Listing → detail URL discovery and field enrichment for scrapers.
 * Polite sequential fetches; never burst.
 */

import * as cheerio from 'cheerio';
import { classifyListingAudience } from '@/lib/events/audience';
import { shouldForceGroupClassFromUrl } from '@/lib/feed/group-class';
import {
  fetchHtml,
  parseSlovakDate,
  parseTimeOnDate,
  truncateHtmlForParse,
} from '@/lib/scrape/fetch';
import type { NormalizedScrapedEvent } from '@/lib/scrape/types';
import { dateOnlySortInstant } from '@/src/lib/scraper/date-only-time';
import {
  applySourceEvidence,
  buildSourceEvidence,
  type SourceEvidence,
} from '@/src/lib/scraper/source-evidence';
import { groundScrapedEventDates } from '@/src/lib/scraper/ground-dates';
import type { ScrapedEvent } from '@/src/lib/scraper/types';
import { htmlToCleanText, sleep, HOST_DELAY_MS } from '@/src/lib/scraper/fetcher';

/** Max detail pages followed per listing URL (rate-limit safety). */
export const MAX_DETAILS_PER_LISTING = 15;

const DETAIL_PATH =
  /\/(?:e-\d+|event|events|podujati|podujatia|announcements?|aktualit|aktualita|turnaj|tournament|listky|vstupenk|kruzky|kr[uú][zž]ky|kurzy?|tabory|t[aá]bory|camps?|clubs?|workshop)/i;

/** Nav / footer / cart — never treat as event detail cards. */
const DETAIL_NOISE_PATH =
  /\/(?:cart|kosik|kontakty?|contact|o-nas|about|oou|gdpr|vpm|zverejovanie|login|prihlasenie|eshop|shop|produkt)(?:\/|$)/i;

const TIME_RE = /(\d{1,2})\s*[.:]\s*(\d{2})/;

export type DiscoveredDetailLink = {
  url: string;
  anchorText: string;
};

export type DetailPageEnrichment = {
  url: string;
  cleanText: string;
  title: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  timeKnown: boolean;
  locationName: string | null;
  description: string | null;
  ticketUrl: string | null;
  forKids: boolean;
  forWomen: boolean;
  priceText: string | null;
};

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function sameHost(a: string, b: string): boolean {
  try {
    return new URL(a).host.replace(/^www\./, '') === new URL(b).host.replace(/^www\./, '');
  } catch {
    return false;
  }
}

function absoluteUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function randomDetailDelay(): number {
  return (
    HOST_DELAY_MS.min +
    Math.floor(Math.random() * (HOST_DELAY_MS.max - HOST_DELAY_MS.min + 1))
  );
}

/**
 * Collect same-host candidate detail links from a listing page.
 */
export function discoverDetailUrls(html: string, baseUrl: string): DiscoveredDetailLink[] {
  const $ = cheerio.load(truncateHtmlForParse(html));
  const out: DiscoveredDetailLink[] = [];
  const seen = new Set<string>();

  $('a[href]').each((_, el) => {
    const href = ($(el).attr('href') ?? '').trim();
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return;
    }
    const abs = absoluteUrl(href, baseUrl);
    if (!abs || !sameHost(abs, baseUrl)) return;
    let path: string;
    try {
      path = new URL(abs).pathname;
    } catch {
      return;
    }
    if (path === '/' || path.length < 2) return;
    if (DETAIL_NOISE_PATH.test(path)) return;
    const listingPath = (() => {
      try {
        return new URL(baseUrl).pathname.replace(/\/+$/, '') || '/';
      } catch {
        return '/';
      }
    })();
    const isChildOfListing =
      listingPath.length > 1 &&
      path.startsWith(`${listingPath}/`) &&
      path.length > listingPath.length + 2;
    if (!DETAIL_PATH.test(path) && !DETAIL_PATH.test(href) && !isChildOfListing) {
      // Soft: long slug paths that look like event pages
      if (!/\/[a-z0-9-]{12,}/i.test(path)) return;
    }
    const key = abs.split('#')[0]!.replace(/\/$/, '');
    if (seen.has(key)) return;
    seen.add(key);
    let anchorText = $(el).text().replace(/\s+/g, ' ').trim().slice(0, 160);
    if (!anchorText) {
      const alt = $(el).find('img[alt]').first().attr('alt')?.trim()
        || $(el).attr('aria-label')?.trim()
        || $(el).attr('title')?.trim()
        || '';
      anchorText = alt.slice(0, 160);
    }
    if (!anchorText) {
      const slug = key.split('/').pop()?.replace(/[-_]+/g, ' ') ?? '';
      anchorText = slug.slice(0, 160);
    }
    out.push({ url: key, anchorText });
  });

  return out;
}

/**
 * Card-grid links that are children of the listing path (or classic detail slugs).
 * Used when the listing only shows teasers and real data lives on detail pages.
 */
export function discoverCardDetailLinks(
  html: string,
  listingUrl: string,
): DiscoveredDetailLink[] {
  const listingPath = (() => {
    try {
      return new URL(listingUrl).pathname.replace(/\/+$/, '') || '/';
    } catch {
      return '/';
    }
  })();

  return discoverDetailUrls(html, listingUrl).filter((link) => {
    try {
      const path = new URL(link.url).pathname.replace(/\/+$/, '');
      if (DETAIL_NOISE_PATH.test(path)) return false;
      if (path === listingPath) return false;
      if (listingPath.length > 1 && path.startsWith(`${listingPath}/`)) return true;
      return DETAIL_PATH.test(path);
    } catch {
      return false;
    }
  });
}

/**
 * Pick the best detail URL for an event title from discovered links.
 */
export function matchDetailUrl(
  title: string,
  links: DiscoveredDetailLink[],
): string | null {
  const needle = fold(title);
  if (!needle || needle.length < 4 || links.length === 0) return null;

  const tokens = needle
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4)
    .slice(0, 6);
  if (tokens.length === 0) return null;

  let best: { url: string; score: number } | null = null;
  for (const link of links) {
    const hay = fold(`${link.anchorText} ${link.url}`);
    let score = 0;
    for (const t of tokens) {
      if (hay.includes(t)) score += t.length;
    }
    // Strong path slug match (harlem-globetrotters)
    const slug = needle.replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    if (slug.length >= 8 && hay.includes(slug.slice(0, 20))) score += 40;
    if (score < 8) continue;
    if (!best || score > best.score) best = { url: link.url, score };
  }
  return best?.url ?? null;
}

function extractClockOnDate(text: string, day: Date): { at: Date; known: boolean } {
  // Prefer "Dátum eventu … 19:00" / date line nearby
  const eventBlock = text.match(
    /d[aá]tum\s+eventu[\s\S]{0,120}?(\d{1,2})\s*[.:]\s*(\d{2})/i,
  );
  if (eventBlock) {
    const at = parseTimeOnDate(day, `${eventBlock[1]}:${eventBlock[2]}`);
    if (at) return { at, known: true };
  }
  const nearDate = text.match(
    /(\d{1,2}\.\s*\d{1,2}\.\s*\d{4}|\d{1,2}\.\s*[a-záäčďéíľĺňóôŕšťúýž]+\s*\d{4})[^\d]{0,40}(\d{1,2})\s*[.:]\s*(\d{2})/i,
  );
  if (nearDate) {
    const at = parseTimeOnDate(day, `${nearDate[2]}:${nearDate[3]}`);
    if (at) return { at, known: true };
  }
  const any = TIME_RE.exec(text);
  if (any) {
    const at = parseTimeOnDate(day, `${any[1]}:${any[2]}`);
    if (at) return { at, known: true };
  }
  return { at: day, known: false };
}

/**
 * Fetch and parse one detail page into structured enrichment.
 */
export async function enrichFromDetailPage(url: string): Promise<DetailPageEnrichment | null> {
  let html: string;
  try {
    html = await fetchHtml(url);
  } catch (err) {
    console.warn(
      `[detail-enrich] fetch failed ${url}:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }

  const $ = cheerio.load(truncateHtmlForParse(html));
  const cleanText = htmlToCleanText(html).slice(0, 48_000);
  if (cleanText.length < 40) return null;

  const title =
    $('h1').first().text().replace(/\s+/g, ' ').trim() ||
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('title').first().text().replace(/\s*[-|].*$/, '').trim() ||
    null;

  const ogDesc = $('meta[property="og:description"]').attr('content')?.trim() || null;

  let startsAt: Date | null = null;
  let endsAt: Date | null = null;
  // Prefer explicit season/term ranges over registration / occupancy timestamps.
  const odDo = cleanText.match(
    /(?:term[ií]n\s*)?od\s+(\d{1,2}\.\s*[a-záäčďéíľĺňóôŕšťúýž]+\s*\d{4}|\d{1,2}\.\s*\d{1,2}\.\s*\d{4})\s+do\s+(\d{1,2}\.\s*[a-záäčďéíľĺňóôŕšťúýž]+\s*\d{4}|\d{1,2}\.\s*\d{1,2}\.\s*\d{4})/i,
  );
  const termínLine = cleanText.match(
    /term[ií]n[^\d]{0,40}(\d{1,2}\.\s*(?:[a-záäčďéíľĺňóôŕšťúýž]+\s*\d{4}|\d{1,2}\.\s*\d{4}))/i,
  );
  const dateMatch =
    odDo
      ? [odDo[0], odDo[1]] as RegExpMatchArray
      : termínLine ||
        cleanText.match(/(\d{1,2}\.\s*\d{1,2}\.\s*\d{4})/) ||
        cleanText.match(
          /(\d{1,2}\.\s*(?:janu[aá]ra|febru[aá]ra|marca|apr[ií]la|m[aá]ja|j[uú]na|j[uú]la|augusta|septembra|okt[oó]bra|novembra|decembra)\s*\d{4})/i,
        ) ||
        cleanText.match(
          /((?:pondelok|utorok|streda|štvrtok|piatok|sobota|nedeľa)[^\d]{0,20}\d{1,2}\.\s*[a-záäčďéíľĺňóôŕšťúýž]+\s*\d{4})/i,
        );
  if (dateMatch?.[1]) {
    startsAt = parseSlovakDate(dateMatch[1]);
  }
  if (odDo?.[2]) {
    endsAt = parseSlovakDate(odDo[2]);
  }

  let timeKnown = false;
  if (startsAt) {
    const clock = extractClockOnDate(cleanText, startsAt);
    startsAt = clock.at;
    timeKnown = clock.known;
    if (!timeKnown) {
      startsAt = dateOnlySortInstant(startsAt.toISOString());
    }
  }

  const ticketHref =
    $('a')
      .filter((_, a) =>
        /vstupenk|k[uú]pi[tť]|ticket|registr|prihl/i.test($(a).text()),
      )
      .first()
      .attr('href') ?? null;
  const ticketUrl = ticketHref ? absoluteUrl(ticketHref, url) : url;

  const locationName =
    cleanText.match(/gopass\s*ar[eé]n/i)?.[0] ||
    cleanText.match(
      /(?:miesto|venue|lok[aá]cia)\s*[:.]?\s*([^\n.]{4,60})/i,
    )?.[1]?.trim() ||
    null;

  const priceMatch = cleanText.match(/(?:od\s+)?(\d+[.,]?\d*)\s*€/);
  const priceText = priceMatch
    ? /zadarmo|free/i.test(cleanText.slice(0, 500))
      ? 'Zadarmo'
      : `od ${priceMatch[1]} €`
    : /zadarmo|free/i.test(cleanText.slice(0, 800))
      ? 'Zadarmo'
      : null;

  const audience = classifyListingAudience({
    title: title ?? '',
    description: ogDesc ?? cleanText.slice(0, 400),
    sourceUrl: url,
    locationName,
  });

  return {
    url,
    cleanText,
    title,
    startsAt,
    endsAt,
    timeKnown,
    locationName,
    description: ogDesc,
    ticketUrl,
    forKids: audience.forKids,
    forWomen: audience.forWomen,
    priceText,
  };
}

export type ScrapedEventWithDetail = ScrapedEvent & {
  sourceExcerpt?: string | null;
  sourceEvidence?: SourceEvidence | null;
};

/**
 * For each scraped event, follow a matching detail URL when useful, then
 * ground evidence on the detail (or listing) text.
 */
export async function enrichScrapedEventsWithDetails(
  events: ScrapedEvent[],
  listingUrl: string,
  listingCleanText: string,
  listingHtml?: string,
  maxDetails = MAX_DETAILS_PER_LISTING,
): Promise<ScrapedEventWithDetail[]> {
  if (events.length === 0) return [];

  // Weekly rozvrh / skupinové tréningy: keep schedule-page URLs and evidence.
  // Following program detail pages (e.g. /sebaobrana-pre-deti-8) rewrites
  // originalUrl away from the venue schedule and breaks group-class identity.
  if (shouldForceGroupClassFromUrl(listingUrl)) {
    const anchored = events.map((event) => ({
      ...event,
      originalUrl: listingUrl,
      isGroupClass: event.isGroupClass || true,
    }));
    return applySourceEvidence(listingCleanText, anchored, listingUrl);
  }

  const links = listingHtml ? discoverDetailUrls(listingHtml, listingUrl) : [];
  const detailCache = new Map<string, DetailPageEnrichment | null>();
  let fetched = 0;

  const listingHost = (() => {
    try {
      return new URL(listingUrl).origin;
    } catch {
      return listingUrl;
    }
  })();

  const out: ScrapedEventWithDetail[] = [];

  for (const event of events) {
    let next: ScrapedEventWithDetail = { ...event };
    let evidenceText = listingCleanText;
    let evidenceUrl = listingUrl;

    const currentUrl = (event.originalUrl || listingUrl).trim();
    const onListing =
      !currentUrl ||
      currentUrl === listingUrl ||
      currentUrl.replace(/\/$/, '') === listingUrl.replace(/\/$/, '') ||
      currentUrl === listingHost ||
      currentUrl === `${listingHost}/`;

    const needsDetail =
      onListing ||
      event.timeKnown === false ||
      links.some((l) => fold(l.anchorText).includes(fold(event.title).slice(0, 20)));

    if (needsDetail && links.length > 0 && fetched < maxDetails) {
      const matched = matchDetailUrl(event.title, links);
      if (matched && matched !== listingUrl) {
        let detail = detailCache.get(matched);
        if (detail === undefined) {
          if (fetched > 0) await sleep(randomDetailDelay());
          fetched += 1;
          detail = await enrichFromDetailPage(matched);
          detailCache.set(matched, detail);
        }
        if (detail) {
          next = applyDetailToScraped(next, detail);
          evidenceText = detail.cleanText;
          evidenceUrl = detail.url;
        }
      }
    } else if (!onListing && currentUrl !== listingUrl) {
      // Already points at a detail — fetch once for evidence if we have budget
      if (fetched < maxDetails && !detailCache.has(currentUrl)) {
        if (fetched > 0) await sleep(randomDetailDelay());
        fetched += 1;
        const detail = await enrichFromDetailPage(currentUrl);
        detailCache.set(currentUrl, detail);
        if (detail) {
          next = applyDetailToScraped(next, detail);
          evidenceText = detail.cleanText;
          evidenceUrl = detail.url;
        }
      } else {
        const cached = detailCache.get(currentUrl);
        if (cached) {
          next = applyDetailToScraped(next, cached);
          evidenceText = cached.cleanText;
          evidenceUrl = cached.url;
        }
      }
    }

    const grounded = groundScrapedEventDates(
      evidenceText,
      applySourceEvidence(evidenceText, [next], evidenceUrl),
    );
    if (grounded[0]) {
      out.push(grounded[0]);
    } else {
      // Keep event even if evidence filter would drop — attach soft evidence
      const soft = buildSourceEvidence(evidenceText, next, { sourceUrl: evidenceUrl });
      const softGrounded = groundScrapedEventDates(evidenceText, [
        {
          ...next,
          sourceExcerpt: soft.excerpt || null,
          sourceEvidence: soft,
        },
      ]);
      out.push(softGrounded[0] ?? {
        ...next,
        sourceExcerpt: soft.excerpt || null,
        sourceEvidence: soft,
      });
    }
  }

  return out;
}

function applyDetailToScraped(
  event: ScrapedEvent,
  detail: DetailPageEnrichment,
): ScrapedEvent {
  const startTime =
    detail.startsAt && !Number.isNaN(detail.startsAt.getTime())
      ? detail.startsAt.toISOString()
      : event.startTime;
  const endTime =
    detail.endsAt && !Number.isNaN(detail.endsAt.getTime())
      ? dateOnlySortInstant(detail.endsAt.toISOString()).toISOString()
      : event.endTime;
  const timeKnown = detail.startsAt ? detail.timeKnown : event.timeKnown !== false;
  return {
    ...event,
    // Keep listing/schedule URL as identity; detail is only for richer copy.
    // Card seeds already point originalUrl at the detail page — keep that.
    originalUrl: event.originalUrl,
    startTime,
    endTime: endTime ?? null,
    timeKnown,
    locationName: detail.locationName?.trim() || event.locationName,
    description: detail.description || event.description,
    priceText: detail.priceText || event.priceText,
    isForKids: detail.forKids || Boolean(event.isForKids),
    isForWomenOnly: detail.forWomen || Boolean(event.isForWomenOnly),
  };
}

/**
 * Apply detail enrichment onto a normalized adapter event (optional evidence).
 */
export function applyDetailToNormalized(
  event: NormalizedScrapedEvent,
  detail: DetailPageEnrichment,
): NormalizedScrapedEvent & {
  timeKnown?: boolean;
  sourceExcerpt?: string | null;
  sourceEvidence?: SourceEvidence | null;
} {
  const startsAt =
    detail.startsAt && !Number.isNaN(detail.startsAt.getTime())
      ? detail.startsAt
      : event.startsAt;
  const timeKnown = detail.timeKnown;
  const stub: ScrapedEvent = {
    title: event.title,
    sportType: event.sport,
    isTournament: event.category === 'tournament',
    isGroupClass: false,
    isCamp: false,
    isWorkshop: false,
    isCourse: false,
    isForKids: Boolean(event.forKids),
    isForWomenOnly: Boolean(event.forWomen),
    startTime: startsAt.toISOString(),
    timeKnown,
    originalUrl: detail.url,
    description: detail.description ?? event.description ?? '',
    locationName: detail.locationName ?? event.locationName ?? '',
    priceText: detail.priceText ?? null,
  };
  const evidence = buildSourceEvidence(detail.cleanText, stub, { sourceUrl: detail.url });
  return {
    ...event,
    startsAt,
    sourceUrl: detail.url,
    ticketUrl: detail.ticketUrl || event.ticketUrl || detail.url,
    description: detail.description || event.description,
    locationName: detail.locationName || event.locationName,
    forKids: detail.forKids || event.forKids,
    forWomen: detail.forWomen || event.forWomen,
    priceCents:
      event.priceCents ??
      (detail.priceText && /zadarmo|free/i.test(detail.priceText)
        ? 0
        : detail.priceText?.match(/(\d+)/)
          ? Number(detail.priceText.match(/(\d+)/)![1]) * 100
          : undefined),
    timeKnown,
    sourceExcerpt: evidence.excerpt || null,
    sourceEvidence: evidence,
  };
}
