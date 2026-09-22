import * as cheerio from 'cheerio';
import { resolveSportType } from '@/lib/ai/theme-config';
import { tagScrapedListingAudience } from '@/lib/events/audience';
import {
  errResult,
  fetchHtml,
  MAX_LOOP_ITERATIONS,
  okResult,
  parseSlovakDate,
  parseTimeOnDate,
  slugify,
  truncateHtmlForParse,
} from '@/lib/scrape/fetch';
import { tagScrapedEventLocation } from '@/lib/scrape/tag-location';
import type { AdapterResult, NormalizedScrapedEvent } from '@/lib/scrape/types';
import {
  splitAnnouncementCalendar,
  type AnnouncementActivity,
} from '@/src/lib/scraper/announcement-calendar';

const HOME_URL = 'https://www.tenisadvantage.sk/';
const HOSTS = new Set(['tenisadvantage.sk', 'www.tenisadvantage.sk']);

const VENUE_KEY = 'tenis-advantage';
const VENUE_NAME = 'Tenisová škola Advantage';
const CITY = 'Bratislava';
const ADDRESS = 'Botanická 35, Bratislava-Karlova Ves';

/** Polite gap between detail fetches (ms). */
const DETAIL_PAUSE_MS = 2000;

/**
 * Tenisová škola Advantage — follow announcement cards into body text and
 * split dated calendars into discrete playable events (women's tournament ≠
 * men's doubles on the same day).
 */
export async function scrapeTenisAdvantage(): Promise<AdapterResult> {
  try {
    const homeHtml = await fetchHtml(HOME_URL);
    const detailUrls = discoverAnnouncementUrls(homeHtml, HOME_URL);
    // Always try the known autumn calendar page (homepage only shows a teaser date).
    detailUrls.add('https://tenisadvantage.sk/announcements/tenisova-jesen');
    detailUrls.add('https://www.tenisadvantage.sk/announcements/tenisova-jesen');

    const events: NormalizedScrapedEvent[] = [];
    const seen = new Set<string>();
    let pass = 0;

    for (const url of detailUrls) {
      if (++pass > MAX_LOOP_ITERATIONS) break;
      if (pass > 1) await sleep(DETAIL_PAUSE_MS);

      let html: string;
      try {
        html = await fetchHtml(url);
      } catch (err) {
        console.warn(
          `[scrape.tenis-advantage] skip ${url}:`,
          err instanceof Error ? err.message : err,
        );
        continue;
      }

      const $ = cheerio.load(truncateHtmlForParse(html));
      const title =
        $('h1').first().text().replace(/\s+/g, ' ').trim() ||
        $('title').first().text().split(/[|\-–—]/)[0]?.trim() ||
        null;
      const bodyText = extractMainText($);
      const activities = splitAnnouncementCalendar(bodyText, { seriesTitle: title });

      for (const activity of activities) {
        const event = activityToNormalized(activity, url);
        if (seen.has(event.externalId)) continue;
        seen.add(event.externalId);
        events.push(
          tagScrapedListingAudience(
            tagScrapedEventLocation({
              ...event,
              address: ADDRESS,
              locationName: VENUE_NAME,
            }),
          ),
        );
      }
    }

    return okResult('tenis-advantage', events);
  } catch (error) {
    return errResult('tenis-advantage', error);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function discoverAnnouncementUrls(html: string, baseUrl: string): Set<string> {
  const $ = cheerio.load(truncateHtmlForParse(html));
  const out = new Set<string>();
  $('a[href]').each((_, el) => {
    const href = ($(el).attr('href') ?? '').trim();
    if (!href || href.startsWith('#') || href.startsWith('mailto:')) return;
    let absolute: URL;
    try {
      absolute = new URL(href, baseUrl);
    } catch {
      return;
    }
    if (!HOSTS.has(absolute.hostname.toLowerCase())) return;
    const path = absolute.pathname.toLowerCase();
    if (
      /\/announcements?\//.test(path) ||
      /\/aktualit/.test(path) ||
      /\/eventy?\//.test(path) ||
      /\/turnaj/.test(path)
    ) {
      absolute.hash = '';
      absolute.search = '';
      out.add(absolute.toString());
    }
  });
  return out;
}

function extractMainText($: ReturnType<typeof cheerio.load>): string {
  const root =
    $('article, main, .announcement, .post-content, .entry-content, #content').first().length > 0
      ? $('article, main, .announcement, .post-content, .entry-content, #content').first()
      : $('body');
  return root.text().replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function activityToNormalized(
  activity: AnnouncementActivity,
  sourceUrl: string,
): NormalizedScrapedEvent {
  const dateRaw = `${activity.day}.${activity.month}.${activity.year}`;
  const base = parseSlovakDate(dateRaw) ?? new Date(activity.year, activity.month - 1, activity.day, 9, 0, 0);
  const clock = `${String(activity.startHour).padStart(2, '0')}:${String(activity.startMinute).padStart(2, '0')}`;
  const startsAt = parseTimeOnDate(base, clock);
  const externalId = `tenis-advantage-${startsAt.toISOString().slice(0, 16)}-${slugify(activity.title)}`;

  return {
    source: 'tenis-advantage',
    externalId,
    title: activity.title,
    sport: 'TENNIS',
    sportType: resolveSportType(activity.sportType === 'Padel' ? 'PADEL' : 'TENNIS'),
    category: activity.isTournament ? 'tournament' : 'fitness',
    participationMode: 'participate',
    startsAt,
    city: CITY,
    venueKey: VENUE_KEY,
    description: activity.description,
    sourceUrl,
    ticketUrl: sourceUrl,
    priceCents: 0,
    forKids: activity.isForKids,
    forWomen: activity.isForWomenOnly,
  };
}
