import * as cheerio from 'cheerio';
import {
  errResult,
  fetchHtml,
  okResult,
  parsePriceCents,
  parseSlovakDate,
  parseTimeOnDate,
  slugify,
} from '@/lib/scrape/fetch';
import { detectExplicitKidsAudience } from '@/lib/events/for-kids';
import { tagScrapedEventLocation } from '@/lib/scrape/tag-location';
import type { AdapterResult, NormalizedScrapedEvent, ParticipationMode } from '@/lib/scrape/types';
import type { SportTypeKey } from '@/lib/ai/theme-config';
import { resolveSportType } from '@/lib/ai/theme-config';
import { detectEventSport } from '@/lib/constants/sports';
import { appWeekday } from '@/lib/event-date-filter';
import { SCRAPE_DEFAULT_LOCAL_HOUR, getZonedParts, zonedLocalDateTime, alignStartsAtWithCopyTime, formatAppTime } from '@/lib/datetime/bratislava';

const SPORT_URL = 'https://www.citylife.sk/tag/sport';
const BASE = 'https://www.citylife.sk';

/** JS getDay(): 0=Sun … 6=Sat — Slovak weekday names (diacritics stripped). */
const WEEKDAY_TO_JS: Record<string, number> = {
  nedela: 0,
  pondelok: 1,
  utorok: 2,
  streda: 3,
  stvrtok: 4,
  piatok: 5,
  sobota: 6,
};

/**
 * Bratislava CityLife sport listings.
 * Listing cards only have date ranges; real weekday + clock live on detail pages
 * inside "Pridaj do kalendára" — never trust the Odporúčame sidebar for facts.
 * Source: https://www.citylife.sk/tag/sport
 */
export async function scrapeCitylife(): Promise<AdapterResult> {
  try {
    const html = await fetchHtml(SPORT_URL);
    const $ = cheerio.load(html);
    const listings: Array<{ title: string; href: string; intro: string; datumcas: string }> = [];
    const seenHref = new Set<string>();

    $('.node-teaser, .node-teaser-mini').each((_, el) => {
      const $el = $(el);
      const link = $el.find('h3.title a, h2 a, h3 a').first();
      const title = link.text().replace(/\s+/g, ' ').trim();
      const href = link.attr('href') ?? '';
      if (!title || !href) return;

      const typ = $el.find('.event-typ').first().text().replace(/\s+/g, ' ').trim().toLowerCase();
      if (/miesto|v[yý]let/.test(typ) || /\/miesto\//i.test(href)) return;

      const intro = $el.find('.intro, .field-name-body').first().text().replace(/\s+/g, ' ').trim();
      const datumcas = $el.find('.datumcas').first().text().replace(/\s+/g, ' ').trim();
      if (!datumcas) return;

      const absolute = absoluteUrl(href);
      if (seenHref.has(absolute)) return;
      seenHref.add(absolute);
      listings.push({ title, href: absolute, intro, datumcas });
    });

    const events: NormalizedScrapedEvent[] = [];
    const seenExternal = new Set<string>();

    for (const listing of listings.slice(0, 25)) {
      let detailHtml: string | null = null;
      try {
        detailHtml = await fetchHtml(listing.href);
      } catch {
        detailHtml = null;
      }

      const enriched = detailHtml
        ? parseDetailPage(detailHtml, listing)
        : parseListingFallback(listing);

      for (const event of enriched) {
        if (seenExternal.has(event.externalId)) continue;
        seenExternal.add(event.externalId);
        events.push(tagScrapedEventLocation(event));
      }
    }

    return okResult('citylife', events.slice(0, 80));
  } catch (error) {
    return errResult('citylife', error);
  }
}

function parseDetailPage(
  html: string,
  listing: { title: string; href: string; intro: string; datumcas: string },
): NormalizedScrapedEvent[] {
  const $ = cheerio.load(html);
  const title =
    $('h1').first().text().replace(/\s+/g, ' ').trim() || listing.title;

  // Drop "Odporúčame" widgets only — broad `.block-views` also deletes the event calendar.
  $('.view-odporucame, aside .view, .region-sidebar .view, #block-views-odporucame').remove();
  $('h2, h3').each((_, el) => {
    if (/^odpor[uú][cč]ame$/i.test($(el).text().replace(/\s+/g, ' ').trim())) {
      $(el).parent().remove();
    }
  });
  const fullText = $('body').text();
  const mainText = stripRecommended(fullText);

  const bodyNodeText = $('.field-name-body, .node-content .content, article .content')
    .first()
    .text()
    .replace(/\s+/g, ' ')
    .trim();
  const editorial = stripRecommended(bodyNodeText || mainText);

  // Prefer DOM calendar rows ("25.08.2026 18:00 | Eurovea") over free-text heuristics.
  const calendarStarts = parseCalendarFromDom($);
  const calendarBlock =
    calendarStarts.length > 0
      ? ''
      : extractCalendarBlock(mainText) || extractCalendarBlock(fullText);
  const lead =
    extractLead(editorial, title) ||
    listing.intro.replace(/\s*Viac\s*$/i, '').trim();

  const venueLabel =
    extractVenueFromDetail(editorial) ||
    extractVenueFromCalendar(calendarBlock) ||
    extractVenueFromDom($) ||
    extractVenue(listing.datumcas) ||
    'Eurovea';

  const forKids = detectForKids(listing.href, title, lead, editorial);
  const participationMode = classifyParticipation(title, lead, editorial);
  const { sport, sportType } = detectSport(title, lead);
  const priceCents = extractPriceCents(editorial) ?? 0;
  const baseExternalId = slugify(
    listing.href.replace(/^https?:\/\//, '').replace(/\/+$/, ''),
  );

  const textCalendarStarts =
    calendarStarts.length > 0 ? [] : parseCalendarOccurrences(calendarBlock);
  const schedule = parseRecurringSchedule(`${lead}\n${editorial.slice(0, 500)}`);
  const range = parseDateRange(listing.datumcas);

  let starts: Date[] = [];
  const resolvedCalendar = calendarStarts.length > 0 ? calendarStarts : textCalendarStarts;
  if (resolvedCalendar.length > 0) {
    // Prefer explicit CityLife calendar rows — most accurate clock.
    starts = resolvedCalendar;
  } else if (schedule && range) {
    starts = expandWeekdayInRange(range.start, range.end, schedule.weekday, schedule.time);
  } else if (range) {
    const time = schedule?.time ?? extractExplicitTime(lead) ?? null;
    // Multi-day tournaments/festivals without clock → one card per day (default 10:00).
    if (!time && !schedule && participationMode === 'spectator') {
      starts = expandDailyInRange(range.start, range.end, '10:00');
    } else {
      const next = nextOccurrenceInRange(
        range.start,
        range.end,
        schedule?.weekday ?? null,
        time,
      );
      if (next) starts = [next];
    }
  } else {
    const single = parseCitylifeRange(listing.datumcas);
    if (single) {
      const time =
        schedule?.time ??
        extractExplicitTime(lead) ??
        extractExplicitTime(calendarBlock) ??
        listingTimeHint(lead);
      starts = [time ? parseTimeOnDate(single, time) : single];
    }
  }

  const entryNote = extractEntryNote(editorial, priceCents, forKids);

  return starts.map((startsAt) =>
    buildEvent({
      title,
      intro: lead,
      datumcas: listing.datumcas,
      absolute: listing.href,
      baseExternalId,
      startsAt,
      venueLabel,
      participationMode,
      sport,
      sportType,
      forKids,
      priceCents,
      scheduleNote: schedule ? schedulePhrase(schedule.weekday, schedule.time) : null,
      entryNote,
    }),
  );
}

function parseListingFallback(listing: {
  title: string;
  href: string;
  intro: string;
  datumcas: string;
}): NormalizedScrapedEvent[] {
  const intro = listing.intro.replace(/\s*Viac\s*$/i, '').trim();
  const schedule = parseRecurringSchedule(intro);
  const range = parseDateRange(listing.datumcas);
  const venueLabel = extractVenue(listing.datumcas);
  const forKids = detectForKids(listing.href, listing.title, intro, '');
  const participationMode = classifyParticipation(listing.title, intro, '');
  const { sport, sportType } = detectSport(listing.title, intro);
  const baseExternalId = slugify(
    listing.href.replace(/^https?:\/\//, '').replace(/\/+$/, ''),
  );

  let starts: Date[] = [];
  if (schedule && range) {
    starts = expandWeekdayInRange(range.start, range.end, schedule.weekday, schedule.time);
  } else if (range) {
    const time = schedule?.time ?? listingTimeHint(intro);
    const next = nextOccurrenceInRange(range.start, range.end, schedule?.weekday ?? null, time);
    if (next) starts = [next];
  } else {
    const single = parseCitylifeRange(listing.datumcas);
    if (single) {
      const time = schedule?.time ?? listingTimeHint(intro);
      starts = [time ? parseTimeOnDate(single, time) : single];
    }
  }

  return starts.map((startsAt) =>
    buildEvent({
      title: listing.title,
      intro,
      datumcas: listing.datumcas,
      absolute: listing.href,
      baseExternalId,
      startsAt,
      venueLabel,
      participationMode,
      sport,
      sportType,
      forKids,
      priceCents: 0,
      scheduleNote: schedule ? schedulePhrase(schedule.weekday, schedule.time) : null,
      entryNote: forKids ? 'Pre deti.' : null,
    }),
  );
}

function buildEvent(input: {
  title: string;
  intro: string;
  datumcas: string;
  absolute: string;
  baseExternalId: string;
  startsAt: Date;
  venueLabel: string;
  participationMode: ParticipationMode;
  sport: string;
  sportType: SportTypeKey;
  forKids: boolean;
  priceCents: number;
  scheduleNote: string | null;
  entryNote: string | null;
}): NormalizedScrapedEvent {
  const copy = [input.intro, input.scheduleNote, input.entryNote].filter(Boolean).join(' ');
  const startsAt = alignStartsAtWithCopyTime(input.startsAt, copy);
  if (process.env.NODE_ENV !== 'production' && formatAppTime(input.startsAt) !== formatAppTime(startsAt)) {
    console.warn(
      `[citylife] aligned startsAt ${formatAppTime(input.startsAt)} → ${formatAppTime(startsAt)} for "${input.title}"`,
    );
  }
  const parts = getZonedParts(startsAt);
  const dayKey = `${parts.year}${String(parts.month).padStart(2, '0')}${String(parts.day).padStart(2, '0')}`;
  return {
    source: 'citylife',
    externalId: `${input.baseExternalId}-${dayKey}`,
    title: input.title.slice(0, 120),
    sport: input.sport,
    sportType: input.sportType,
    category: input.participationMode === 'participate' ? 'fitness' : 'match',
    participationMode: input.participationMode,
    startsAt,
    city: 'Bratislava',
    venueKey: venueKeyFor(input.venueLabel),
    locationName: input.venueLabel || undefined,
    address: [input.venueLabel, input.datumcas].filter(Boolean).join(', '),
    description: buildDescription(
      input.title,
      input.intro,
      input.datumcas,
      input.participationMode,
      input.scheduleNote,
      input.entryNote,
      input.venueLabel,
    ),
    coverUrl: null,
    requiresAiGraphic: true,
    sourceUrl: input.absolute,
    ticketUrl: input.absolute,
    forKids: input.forKids,
    priceCents: input.priceCents,
  };
}

/** Prefer calendar rows: "25.08.2026 18:00 | Eurovea , Pribinova 8" */
function parseCalendarFromDom($: cheerio.CheerioAPI): Date[] {
  const out: Date[] = [];
  const seen = new Set<number>();
  $('div, li, p, td, span, time').each((_, el) => {
    const t = $(el).text().replace(/\s+/g, ' ').trim();
    // Keep short nodes so parent wrappers don't swallow the whole page.
    if (t.length < 12 || t.length > 140) return;
    const m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2})[:.](\d{2})\s*\|/);
    if (!m) return;
    const d = zonedLocalDateTime(
      Number(m[3]),
      Number(m[2]) - 1,
      Number(m[1]),
      Number(m[4]),
      Number(m[5]),
      0,
    );
    if (Number.isNaN(d.getTime())) return;
    const key = d.getTime();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(d);
  });
  return out.sort((a, b) => a.getTime() - b.getTime());
}

function extractVenueFromDom($: cheerio.CheerioAPI): string | null {
  let found: string | null = null;
  $('div, li, p, td, span, time').each((_, el) => {
    if (found) return;
    const t = $(el).text().replace(/\s+/g, ' ').trim();
    if (t.length < 12 || t.length > 140) return;
    const m = t.match(/^\d{1,2}\.\d{1,2}\.\d{4}\s+\d{1,2}[:.]\d{2}\s*\|\s*([^,|]{3,60})\s*,/);
    if (m?.[1]) found = m[1].replace(/\s+/g, ' ').trim();
  });
  return found;
}

/** Keep only text before CityLife "Odporúčame" widgets. */
function stripRecommended(text: string): string {
  return (text.split(/Odpor[uú][cč]ame/i)[0] ?? text).replace(/\s+/g, ' ').trim();
}

/** Isolate the official "Pridaj do kalendára" block when present. */
function extractCalendarBlock(text: string): string {
  const m = text.match(
    /Pridaj do kalend[aá]ra([\s\S]*?)(?:Odpor[uú][cč]ame|Trvanie:|Miesto konania:|$)/i,
  );
  if (m?.[1]) return m[1].replace(/\s+/g, ' ').trim();
  const alt = text.match(/Do kalend[aá]ra([\s\S]*?)(?:Odpor[uú][cč]ame|$)/i);
  return (alt?.[1] ?? '').replace(/\s+/g, ' ').trim();
}

/** Explicit calendar rows: "12.08.2026 17:00 | Eurovea" */
function parseCalendarOccurrences(text: string): Date[] {
  if (!text) return [];
  const out: Date[] = [];
  const seen = new Set<number>();
  const re = /(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2})[:.](\d{2})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    const hour = Number(m[4]);
    const minute = Number(m[5]);
    const d = zonedLocalDateTime(year, month - 1, day, hour, minute, 0);
    if (Number.isNaN(d.getTime())) continue;
    const key = d.getTime();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }
  return out.sort((a, b) => a.getTime() - b.getTime());
}

/** "každý utorok o 7:30" / "každú stredu o 17:00" */
function parseRecurringSchedule(
  text: string,
): { weekday: number; time: string } | null {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const m = normalized.match(
    /kazd[yu]\s+(pondelok|utorok|stredu|streda|stvrtok|piatok|sobotu|sobota|nedelu|nedela)\s+o\s+(\d{1,2}[:.]\d{2})/,
  );
  if (!m?.[1] || !m[2]) return null;
  const accusativeToNominative: Record<string, string> = {
    stredu: 'streda',
    sobotu: 'sobota',
    nedelu: 'nedela',
  };
  const dayKey = accusativeToNominative[m[1]] ?? m[1];
  const weekday = WEEKDAY_TO_JS[dayKey];
  if (weekday === undefined) return null;
  return { weekday, time: m[2].replace('.', ':') };
}

function extractExplicitTime(text: string): string | null {
  const normalized = text.toLowerCase();
  const at = normalized.match(/\bo\s+(\d{1,2}[:.]\d{2})\b/);
  if (at?.[1]) return at[1].replace('.', ':');
  const durationStart = normalized.match(/trvanie\s*:\s*(\d{1,2}[:.]\d{2})\s*[-–—]/);
  if (durationStart?.[1]) return durationStart[1].replace('.', ':');
  return null;
}

function listingTimeHint(intro: string): string | null {
  const schedule = parseRecurringSchedule(intro);
  if (schedule) return schedule.time;
  return extractExplicitTime(intro);
}

function parseDateRange(datumcas: string): { start: Date; end: Date } | null {
  const range = datumcas.match(
    /(\d{1,2}\.\d{1,2}\.\d{4})\s*[-–—]\s*(\d{1,2}\.\d{1,2}\.\d{4})/,
  );
  if (!range?.[1] || !range[2]) return null;
  const start = parseSlovakDate(range[1]);
  const end = parseSlovakDate(range[2]);
  if (!start || !end) return null;
  return { start, end };
}

function expandDailyInRange(start: Date, end: Date, time: string): Date[] {
  const out: Date[] = [];
  const startParts = getZonedParts(start);
  const endParts = getZonedParts(end);
  let y = startParts.year;
  let m = startParts.month;
  let d = startParts.day;
  const endKey = endParts.year * 10000 + endParts.month * 100 + endParts.day;
  const now = Date.now() - 60 * 60 * 1000;

  for (let i = 0; i < 40; i++) {
    const dayKey = y * 10000 + m * 100 + d;
    if (dayKey > endKey) break;
    const startsAt = parseTimeOnDate(zonedLocalDateTime(y, m - 1, d, 12, 0, 0), time);
    if (startsAt.getTime() >= now) out.push(startsAt);
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    y = next.getUTCFullYear();
    m = next.getUTCMonth() + 1;
    d = next.getUTCDate();
  }
  return out;
}

function expandWeekdayInRange(
  start: Date,
  end: Date,
  weekday: number,
  time: string,
): Date[] {
  const out: Date[] = [];
  const startParts = getZonedParts(start);
  const endParts = getZonedParts(end);
  let y = startParts.year;
  let m = startParts.month;
  let d = startParts.day;
  const endKey = endParts.year * 10000 + endParts.month * 100 + endParts.day;

  for (let i = 0; i < 120; i++) {
    const dayKey = y * 10000 + m * 100 + d;
    if (dayKey > endKey) break;
    const noon = zonedLocalDateTime(y, m - 1, d, 12, 0, 0);
    if (appWeekday(noon) === weekday) {
      out.push(parseTimeOnDate(noon, time));
    }
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    y = next.getUTCFullYear();
    m = next.getUTCMonth() + 1;
    d = next.getUTCDate();
  }
  return out;
}

function nextOccurrenceInRange(
  start: Date,
  end: Date,
  weekday: number | null,
  time: string | null,
): Date | null {
  const now = Date.now() - 60 * 60 * 1000;
  const clock = time ?? `${SCRAPE_DEFAULT_LOCAL_HOUR}:00`;
  if (weekday != null) {
    const all = expandWeekdayInRange(start, end, weekday, clock);
    return all.find((d) => d.getTime() >= now) ?? all[all.length - 1] ?? null;
  }

  const endParts = getZonedParts(end);
  const endMs = zonedLocalDateTime(
    endParts.year,
    endParts.month - 1,
    endParts.day,
    23,
    59,
    0,
  ).getTime();

  if (start.getTime() >= now) {
    return parseTimeOnDate(start, clock);
  }

  const todayParts = getZonedParts(new Date());
  let y = todayParts.year;
  let m = todayParts.month;
  let d = todayParts.day;
  for (let i = 0; i < 60; i++) {
    const day = zonedLocalDateTime(y, m - 1, d, 12, 0, 0);
    if (day.getTime() > endMs) break;
    const withTime = parseTimeOnDate(day, clock);
    if (withTime.getTime() >= now) return withTime;
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    y = next.getUTCFullYear();
    m = next.getUTCMonth() + 1;
    d = next.getUTCDate();
  }

  return parseTimeOnDate(
    zonedLocalDateTime(endParts.year, endParts.month - 1, endParts.day, 12, 0, 0),
    clock,
  );
}

function parseCitylifeRange(datumcas: string): Date | null {
  const range = parseDateRange(datumcas);
  if (range) return range.start;
  const single = datumcas.match(/(\d{1,2}\.\d{1,2}\.\d{4})/);
  return single?.[1] ? parseSlovakDate(single[1]) : null;
}

function extractVenue(datumcas: string): string {
  const parts = datumcas.split('/');
  return (parts[1] ?? '').trim();
}

function extractVenueFromCalendar(calendarBlock: string): string | null {
  const m = calendarBlock.match(/\|\s*([^,|]{3,60})\s*,/i);
  if (m?.[1]) return m[1].replace(/\s+/g, ' ').trim();
  return null;
}

function extractVenueFromDetail(text: string): string | null {
  const m = text.match(/(?:Miesto konania|Miesto)\s*:\s*([^.]{5,100})/i);
  if (m?.[1]) return m[1].replace(/\s+/g, ' ').trim().slice(0, 100);
  if (/grassalkovich|grasalkovi[cč]/i.test(text)) return 'Grassalkovichova záhrada';
  if (/n[aá]mest[ií]e?\s+pri\s+eurovea|eurovea/i.test(text)) return 'Eurovea';
  if (/schody.*dunaj|pri\s+dunaji/i.test(text)) return 'Eurovea (schody pri Dunaji)';
  return null;
}

function extractLead(bodyText: string, title: string): string {
  const withoutTitle = bodyText.replace(title, '').trim();
  const cut =
    withoutTitle.split(/Do kalend[aá]ra|Pridaj do kalend[aá]ra|Odpor[uú][cč]ame/i)[0] ?? '';
  return cut
    .replace(/\(function[\s\S]*$/i, ' ')
    .replace(/\bin[aá]\s+akcia\b/gi, ' ')
    .replace(/\bšport\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 400);
}

function extractPriceCents(text: string): number | undefined {
  if (/vstup\s+je\s+bezplatn|zadarmo|vstup\s+zadarmo|bezplatn[eý]/i.test(text)) return 0;
  return parsePriceCents(text);
}

function extractEntryNote(
  text: string,
  priceCents: number,
  forKids: boolean,
): string | null {
  const parts: string[] = [];
  if (forKids) parts.push('Pre deti');
  if (/vstup\s+je\s+bezplatn|zadarmo|bezplatn[eý]/i.test(text) || priceCents === 0) {
    parts.push('Vstup voľný');
  } else if (priceCents > 0) {
    const euros = (priceCents / 100).toFixed(priceCents % 100 === 0 ? 0 : 2).replace('.', ',');
    parts.push(`Vstup ${euros} €`);
  }
  if (/kapacita\s+je\s+obmedzen|prihl[aá]si[tť]/i.test(text)) {
    parts.push('Nutná registrácia');
  }
  return parts.length ? `${parts.join(' · ')}.` : null;
}

function detectForKids(url: string, title: string, intro: string, body: string): boolean {
  return detectExplicitKidsAudience({
    title,
    description: `${intro} ${body}`.slice(0, 2000),
    sourceUrl: url,
  });
}

function classifyParticipation(
  title: string,
  lead: string,
  body: string,
): ParticipationMode {
  const t = `${title} ${lead}`;
  if (/otvoren[ií]e|ceremoni[aá]l|majstrovst|turnaj|quest|liga|vstupenk|div[aá]k/i.test(t)) {
    return 'spectator';
  }
  if (/3\s*x\s*3|3x3/i.test(t) && /basket/i.test(t)) return 'spectator';
  if (/cvi[cč]|joga|barre|kor[cč]u[ľl]|tr[eé]ning|beh|skupin|fitness\s*&\s*fun/i.test(t)) {
    return 'participate';
  }
  if (/vstup\s+je\s+bezplatn/i.test(body) && /turnaj|liga|quest/i.test(body)) {
    return 'spectator';
  }
  return 'participate';
}

/**
 * Title wins — CityLife intros/sidebars often mention other sports and used to
 * mis-tag wakeboard openings as FITNESS.
 */
function detectSport(
  title: string,
  lead: string,
): { sport: string; sportType: SportTypeKey } {
  const fromTitle = detectEventSport(title, 'OTHER');
  if (fromTitle !== 'OTHER' || /wakeboard|wakeskat|surf|kor[cč]u[ľl]|3\s*x\s*3|3x3/i.test(title)) {
    const sport =
      fromTitle !== 'OTHER'
        ? fromTitle
        : /wakeboard|wakeskat|surf/i.test(title)
          ? 'SURFING'
          : /kor[cč]u[ľl]|inline/i.test(title)
            ? 'OTHER'
            : /3\s*x\s*3|3x3|basket/i.test(title)
              ? 'BASKETBALL'
              : detectEventSport(`${title} ${lead}`, 'FITNESS');
    return { sport, sportType: resolveSportType(sport) };
  }
  const fromLead = detectEventSport(`${title} ${lead}`, 'FITNESS');
  return { sport: fromLead, sportType: resolveSportType(fromLead) };
}

function venueKeyFor(venueLabel: string): string {
  if (/grassalkovich|grasalkovi[cč]/i.test(venueLabel)) return 'citylife-grassalkovich';
  return 'citylife-eurovea';
}

function schedulePhrase(weekday: number, time: string): string {
  const labels = ['nedeľu', 'pondelok', 'utorok', 'stredu', 'štvrtok', 'piatok', 'sobotu'];
  const label = labels[weekday] ?? 'týždeň';
  const each = weekday === 0 || weekday === 3 || weekday === 6 ? 'Každú' : 'Každý';
  return `${each} ${label} o ${time}.`;
}

function buildDescription(
  title: string,
  intro: string,
  datumcas: string,
  mode: ParticipationMode,
  scheduleNote: string | null,
  entryNote: string | null,
  venueLabel: string,
): string {
  const cleanIntro = intro.replace(/\s*Viac\s*$/i, '').trim();
  const modeNote =
    mode === 'participate'
      ? 'Otvorená športová aktivita — môžeš sa zúčastniť.'
      : 'Divácke / voľný vstup na podujatie.';
  const schedule = scheduleNote ? ` ${scheduleNote}` : '';
  const entry = entryNote ? ` ${entryNote}` : '';
  const place = venueLabel ? ` Miesto: ${venueLabel}.` : '';
  return `${title}. ${cleanIntro}${schedule} ${datumcas}.${place}${entry} ${modeNote} Zdroj: citylife.sk`;
}

function absoluteUrl(href: string): string {
  try {
    return new URL(href, BASE).toString();
  } catch {
    return href;
  }
}
