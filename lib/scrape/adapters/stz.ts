import * as cheerio from 'cheerio';
import {
  errResult,
  fetchHtml,
  okResult,
  parseSlovakDate,
  parseTimeOnDate,
  slugify,
} from '@/lib/scrape/fetch';
import type { AdapterResult, NormalizedScrapedEvent, ParticipationMode } from '@/lib/scrape/types';
import { titleIsOutsideBratislava } from '@/lib/cities';

const HOME_URL = 'https://www.stz.sk/';
const TENIS_DOMA_URL = 'https://www.stz.sk/tenis-doma';
const BASE = 'https://www.stz.sk';

const RESULT_TITLE =
  /v[ií][tť]azk?(ou|mi|om)|finalistk?(ou|om)|vypadol|pod[ľl]ah|post[uú]pil[ao]?|z[ií]skal[ao]?\s+titul|prebojoval/i;

const UPCOMING_HINT =
  /uskuto[cč]n[ií]|kon[aá]\s|term[ií]ne|t[yý][zž]dni\s+od|uz[aá]vierka\s+prihl|prihl[aá]sen[eé]|nominovan[eé]|vstupenk|predpredaj|ticketportal/i;

/**
 * Slovak Tennis Association news → upcoming tournaments (participate)
 * vs ticketed spectacles (spectator, e.g. Davis Cup).
 * Sources: https://www.stz.sk/ and https://www.stz.sk/tenis-doma
 */
export async function scrapeStz(): Promise<AdapterResult> {
  try {
    const [homeHtml, tenisHtml] = await Promise.all([
      fetchHtml(HOME_URL),
      fetchHtml(TENIS_DOMA_URL),
    ]);

    const merged = dedupeByExternalId([
      ...parseNewsPage(homeHtml),
      ...parseNewsPage(tenisHtml),
    ]);

    return okResult('stz', merged.slice(0, 40));
  } catch (error) {
    return errResult('stz', error);
  }
}

function parseNewsPage(html: string): NormalizedScrapedEvent[] {
  const $ = cheerio.load(html);
  const events: NormalizedScrapedEvent[] = [];

  $('.news-item').each((_, el) => {
    const $el = $(el);
    const link = $el.find('h2 a').first();
    const title = link.text().replace(/\s+/g, ' ').trim();
    const href = link.attr('href') ?? '';
    if (!title || !href) return;

    const body = $el.find('.news-short-text').text().replace(/\s+/g, ' ').trim();
    const publishRaw = $el
      .text()
      .match(/(\d{1,2}\.\s*\d{1,2}\.\s*\d{4}|\d{1,2}\.\s*\d{2}\.\s*\d{4})/);
    const combined = `${title} ${body}`;

    // Skip pure result write-ups unless they also announce a future event
    if (RESULT_TITLE.test(title) && !UPCOMING_HINT.test(combined)) return;
    if (!isSportEventCandidate(title, body, href)) return;

    const startsAt = extractEventStartsAt(combined) ?? (publishRaw?.[1] ? parseSlovakDate(publishRaw[1]) : null);
    if (!startsAt) return;
    // Result articles often only have publish date in the past week — require future start
    if (startsAt.getTime() < Date.now() - 12 * 3600000) return;

    const participationMode = classifyParticipation(title, body, href);
    const city = detectCity(title, body);
    if (city !== 'Bratislava' || titleIsOutsideBratislava(title)) return;

    const absolute = absoluteUrl(href);
    const externalId = slugify(href.replace(/^https?:\/\//, '').replace(/\/+$/, ''));

    events.push({
      source: 'stz',
      externalId,
      title: title.slice(0, 120),
      sport: 'TENNIS',
      sportType: 'TENNIS',
      category: participationMode === 'participate' ? 'tournament' : 'match',
      participationMode,
      startsAt: parseTimeOnDate(startsAt, '10:00'),
      city,
      venueKey: venueKeyFor(city, combined),
      description: buildDescription(title, body, participationMode),
      coverUrl: null,
      sourceUrl: absolute,
      ticketUrl: extractTicketUrl(body) ?? absolute,
    });
  });

  return events;
}

function isSportEventCandidate(title: string, body: string, href: string): boolean {
  const t = `${title} ${body} ${href}`;
  if (/vstupenk|davis\s*cup|dc:/i.test(t)) return true;
  if (/turnaj|itf|tejt|m\s*sr|majstrovst|j60|j30|wtt|fed\s*cup|davis/i.test(t)) return true;
  if (/\/tenis-doma\/|\/tenis-deti\/|\/seniorsky|\/davis-cup\//i.test(href)) return true;
  return false;
}

function classifyParticipation(title: string, body: string, href: string): ParticipationMode {
  const t = `${title} ${body} ${href}`;
  if (/vstupenk|predpredaj|ticketportal|div[aá]k/i.test(t)) return 'spectator';
  if (/davis-cup\/dc-vstupenk/i.test(href)) return 'spectator';
  // Upcoming tournaments with entry / team registration
  if (
    /turnaj|itf|tejt|uz[aá]vierka|prihl[aá]s|m\s*sr\s+dru[zž]|detsk[yý]\s+davis|fed\s*cup|j60|j30|wtt/i.test(
      t,
    )
  ) {
    return 'participate';
  }
  return 'spectator';
}

function extractEventStartsAt(text: string): Date | null {
  // "od 3. augusta 2026" / "1. - 4. augusta 2026" / "8. septembra 2026"
  const named = text.match(
    /(?:od\s+|term[ií]ne\s+(?:od\s+)?)?(\d{1,2})\.?\s*(?:[–—-]\s*\d{1,2}\.?\s*)?(janu[aá]r\w*|febru[aá]r\w*|marc\w*|apr[ií]l\w*|m[aá]j\w*|j[uú]n\w*|j[uú]l\w*|august\w*|septembr\w*|okt[oó]br\w*|novembr\w*|decembr\w*)\s*(\d{4})?/i,
  );
  if (named?.[1] && named[2]) {
    const parsed = parseSlovakDate(`${named[1]}. ${named[2]} ${named[3] ?? new Date().getFullYear()}`);
    if (parsed) return parsed;
  }

  // "19. a 20. septembra" handled partially by named; also numeric
  const numeric = text.match(/(\d{1,2}\.\s*\d{1,2}\.\s*\d{4})/);
  if (numeric?.[1]) {
    const d = parseSlovakDate(numeric[1]);
    if (d) return d;
  }

  // "týždni od 24. augusta 2026" without year on first number already covered
  const weekOf = text.match(/t[yý][zž]dni\s+od\s+(\d{1,2})\.\s*([a-záäčďéíľĺňóôŕšťúýž]+)\s*(\d{4})/i);
  if (weekOf) {
    return parseSlovakDate(`${weekOf[1]}. ${weekOf[2]} ${weekOf[3]}`);
  }

  return null;
}

function detectCity(title: string, body: string): string {
  const map: Array<[RegExp, string]> = [
    [/bansk(?:ej|á|ou|a)\s+bystric/i, 'Banská Bystrica'],
    [/slovensk(?:ej|á)\s+[ľl]up/i, 'Slovenská Ľupča'],
    [/humenn/i, 'Humenné'],
    [/ko[sš]ic/i, 'Košice'],
    [/[žz]ilin/i, 'Žilina'],
    [/pie[sš][tť]an/i, 'Piešťany'],
    [/poprad/i, 'Poprad'],
    [/nitra/i, 'Nitra'],
    [/trnav/i, 'Trnava'],
    [/bratislav|slovan\s*ba|ntc\s*brat/i, 'Bratislava'],
  ];
  for (const [re, city] of map) {
    if (re.test(title)) return city;
  }
  for (const [re, city] of map) {
    if (re.test(body)) return city;
  }
  return 'Bratislava';
}

function venueKeyFor(_city: string, _text: string): string {
  return 'ntc-bratislava';
}

function extractTicketUrl(body: string): string | null {
  const m = body.match(/https?:\/\/(?:www\.)?(?:predpredaj|ticketportal)[^\s)"']+/i);
  return m?.[0] ?? null;
}

function buildDescription(title: string, body: string, mode: ParticipationMode): string {
  const snippet = body.slice(0, 280);
  if (mode === 'participate') {
    return `${title}. Turnaj / súťaž — možné sa zúčastniť (prihláška cez eTenis / ITF / TE). ${snippet} Zdroj: stz.sk`;
  }
  return `${title}. Divácke podujatie — vstupenky. ${snippet} Zdroj: stz.sk`;
}

function absoluteUrl(href: string): string {
  try {
    return new URL(href, BASE).toString();
  } catch {
    return href;
  }
}

function dedupeByExternalId(events: NormalizedScrapedEvent[]): NormalizedScrapedEvent[] {
  const seen = new Set<string>();
  const out: NormalizedScrapedEvent[] = [];
  for (const e of events) {
    if (seen.has(e.externalId)) continue;
    seen.add(e.externalId);
    out.push(e);
  }
  return out;
}
