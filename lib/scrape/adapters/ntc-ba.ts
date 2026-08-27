import * as cheerio from 'cheerio';
import { resolveSportType } from '@/lib/ai/theme-config';
import { scrapeTextListing } from '@/lib/scrape/adapters/_text-listing';
import {
  fetchHtml,
  okResult,
  parseSlovakDate,
  parseTimeOnDate,
  slugify,
  truncateHtmlForParse,
} from '@/lib/scrape/fetch';
import type { AdapterResult, NormalizedScrapedEvent } from '@/lib/scrape/types';
import { canonicalScrapeSport } from '@/lib/scrape/sources';

/**
 * NTC hosts tennis *and* concerts/shows. Keep only sport-shaped listings —
 * concerts like Horkýže Slíže / Sarah Brightman must not become TENNIS tournaments.
 * Paths use `.html` (trailing-slash folders are empty stubs).
 */
function isNtcSportCandidate(title: string, description?: string): boolean {
  const hay = `${title} ${description ?? ''}`;

  if (
    /koncert|concert|\btour\b|k-?pop|greatest\s+hits|\bband\b|live\s+show|musical|opera|divadlo|stand-?up|comedy|brightman|hork[yý][zž]e|al\s*bano|fever\b|viano|sinatra|mathieu|vondr[aá][cč]kov/i.test(
      hay,
    )
  ) {
    return false;
  }

  return /tenis|tennis|turnaj|tournament|davis|fed\s*cup|itf|wtt|tejt|padel|squash|junior|majstrovst|dru[zž]st|open\b|cup\b|trophy|liga|happy\s*hours/i.test(
    hay,
  );
}

function isSpectatorTennis(title: string, description?: string): boolean {
  const hay = `${title} ${description ?? ''}`;
  return /davis|fed\s*cup|billie\s*jean|vstupenk|divák|spectator/i.test(hay);
}

/** Pull real match dates from news body (listing cards often use the publish date). */
async function enrichDavisCupFromAktuality(): Promise<NormalizedScrapedEvent[]> {
  const url = 'https://www.ntc.sk/aktualita/slovaci-v-davis-cupe-privitaju-grecko.html';
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(truncateHtmlForParse(html));
    const body = $('article, .news-detail, .content, main, body')
      .first()
      .text()
      .replace(/\s+/g, ' ')
      .trim();

    // "19. a 20. septembra 2026" / "19. a 20.9.2026"
    const range = body.match(
      /(\d{1,2})\.\s*a\s*(\d{1,2})\.\s*(?:septembra|9\.)\s*(\d{4})/i,
    );
    const single = body.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
    let day = 19;
    let month = 9;
    let year = 2026;
    if (range) {
      day = Number(range[1]);
      month = 9;
      year = Number(range[3]);
    } else if (single) {
      day = Number(single[1]);
      month = Number(single[2]);
      year = Number(single[3]);
    } else {
      return [];
    }

    const startsAtBase = parseSlovakDate(`${day}.${month}.${year}`);
    if (!startsAtBase) return [];
    const timeMatch = body.match(/SOBOTA[^.]*?od\s+(\d{1,2}[.:]\d{2})/i);
    const startsAt = parseTimeOnDate(startsAtBase, timeMatch?.[1]?.replace('.', ':') ?? '12:00');
    const venueKey = /ko[sš]ice/i.test(body) ? 'ntc-kosice' : 'ntc-bratislava';
    const city = venueKey === 'ntc-kosice' ? 'Košice' : 'Bratislava';
    const ticketMatch = body.match(
      /https?:\/\/(?:www\.)?(?:predpredaj\.zoznam\.sk|ticketportal\.sk)\/[^\s]+/i,
    );
    const ticketUrl = ticketMatch?.[0]?.replace(/[),.;]+$/, '') ?? url;

    return [
      {
        source: 'ntc-ba',
        externalId: `ntc-davis-${startsAt.toISOString().slice(0, 10)}-${slugify('davis-cup-greece')}`,
        title: 'Davis Cup — Slovensko vs Grécko',
        sport: 'TENNIS',
        sportType: resolveSportType('TENNIS'),
        category: 'match',
        participationMode: 'spectator',
        startsAt,
        city,
        venueKey,
        description:
          'I. svetová skupina Davisovho pohára (NTC Košice). CTA: Sledovať — vstupenky na predpredaj / Ticketportal.',
        sourceUrl: url,
        ticketUrl,
      },
    ];
  } catch {
    return [];
  }
}

export async function scrapeNtcBa(): Promise<AdapterResult> {
  const result = await scrapeTextListing({
    source: 'ntc-ba',
    sport: canonicalScrapeSport('TENNIS'),
    venueKey: 'ntc-bratislava',
    urls: [
      'https://www.ntc.sk/',
      'https://www.ntc.sk/aktuality.html',
      'https://www.ntc.sk/podujatia.html',
    ],
    defaultCategory: 'tournament',
    participationMode: 'participate',
  });

  if (result.error) return result;

  const sportOnly = result.events
    .filter((event) => isNtcSportCandidate(event.title, event.description))
    .map((event) =>
      isSpectatorTennis(event.title, event.description)
        ? { ...event, participationMode: 'spectator' as const, category: 'match' as const }
        : event,
    );

  const davis = await enrichDavisCupFromAktuality();
  const merged = [...davis];
  const seen = new Set(merged.map((e) => e.externalId));
  for (const event of sportOnly) {
    if (seen.has(event.externalId)) continue;
    // Prefer dedicated Davis Cup enrichment over publish-dated news card
    if (/davis/i.test(event.title) && davis.length) continue;
    seen.add(event.externalId);
    merged.push(event);
  }

  return okResult('ntc-ba', merged);
}
