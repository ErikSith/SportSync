import * as cheerio from 'cheerio';
import { resolveSportType } from '@/lib/ai/theme-config';
import { detectEventSport } from '@/lib/constants/sports';
import { bratislavaWeekDates } from '@/lib/scrape/adapters/_weekly-schedule';
import {
  errResult,
  fetchHtml,
  parseSlovakDate,
  parseTimeOnDate,
  slugify,
  truncateHtmlForParse,
  upcomingOnly,
} from '@/lib/scrape/fetch';
import type { AdapterResult, NormalizedScrapedEvent } from '@/lib/scrape/types';

const CALENDAR_URL = 'https://fitcamp.formfactory.sk/calendar';
const EVENTY_URL = 'https://www.formfactory.sk/eventy/';

export async function scrapeFormFactory(): Promise<AdapterResult> {
  try {
    const [marketingRaw, classes] = await Promise.all([
      scrapeFormFactoryEventy(),
      scrapeFitCampCalendar(),
    ]);
    // Keep the full published FitCamp week (incl. this morning) so rozpis matches the site.
    // Marketing one-offs can drop already-finished listings.
    const marketing = upcomingOnly(marketingRaw);
    const merged = dedupeByExternalId([...marketing, ...classes]);
    return { source: 'form-factory', events: merged.slice(0, 120) };
  } catch (error) {
    return errResult('form-factory', error);
  }
}

/**
 * FitCamp rozvrh is a weekly HTML table of `.event` cards (meta:id, time, name, room).
 * Prefer structured DOM over regex on flattened cell text — that mixed days/rooms.
 */
async function scrapeFitCampCalendar(): Promise<NormalizedScrapedEvent[]> {
  const html = await fetchHtml(CALENDAR_URL);
  // Week grid is ~65–80KB; default truncate cap is enough.
  const $ = cheerio.load(truncateHtmlForParse(html));
  const events: NormalizedScrapedEvent[] = [];
  const seen = new Set<string>();

  const dayDates = resolveFitCampWeekDates($);
  const dataRows = $('table tr').toArray().slice(1);

  for (const row of dataRows) {
    const cells = $(row).find('td, th');
    if (cells.length < 5) continue;

    cells.each((dayIdx, cell) => {
      if (dayIdx > 6) return;
      const day = dayDates[dayIdx];
      if (!day) return;

      $(cell)
        .find('.event')
        .each((_, el) => {
          const parsed = parseFitCampEventCard($, el, day);
          if (!parsed) return;
          if (seen.has(parsed.externalId)) return;
          seen.add(parsed.externalId);
          events.push(parsed);
        });
    });
  }

  // Fallback if CMS markup changes and `.event` cards disappear
  if (events.length === 0) {
    console.warn('[scrape.form-factory] no .event cards — falling back to cell text parse');
    return scrapeFitCampCalendarTextFallback($, dayDates);
  }

  return events;
}

type CheerioRoot = ReturnType<typeof cheerio.load>;

function resolveFitCampWeekDates($: CheerioRoot): Array<Date | null> {
  const fromLinks: Array<Date | null> = [];
  $('.scheduler-go-to-day').each((_, el) => {
    const raw = ($(el).attr('meta:date') ?? $(el).text()).replace(/\s+/g, ' ').trim();
    const parsed = parseSlovakDate(raw);
    if (parsed) fromLinks.push(parsed);
  });
  if (fromLinks.length >= 7) return fromLinks.slice(0, 7);
  return bratislavaWeekDates(new Date(), 0);
}

function parseFitCampEventCard(
  $: CheerioRoot,
  el: unknown,
  day: Date,
): NormalizedScrapedEvent | null {
  const $el = $(el as never);
  const metaId = ($el.attr('meta:id') ?? '').trim();
  const timeRaw = $el.find('.eventlength').first().text().replace(/\s+/g, ' ').trim();
  const title = $el.find('.event_name').first().text().replace(/\s+/g, ' ').trim();
  const room = $el.find('.room').first().text().replace(/\s+/g, ' ').trim();
  const instructor = $el.find('.instructor').first().text().replace(/\s+/g, ' ').trim();
  const isReplacement = /n[aá]hrada/i.test(
    $el.find('.event_kind, .replacement-bar').text(),
  );

  if (!title || title.length < 2) return null;

  const timeMatch = timeRaw.match(
    /(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})/,
  );
  if (!timeMatch) return null;

  const startTime = `${timeMatch[1]}:${timeMatch[2]}`;
  const endTime = `${timeMatch[3]}:${timeMatch[4]}`;
  const startsAt = parseTimeOnDate(day, startTime);

  const externalId = metaId
    ? `ff-class-${metaId}`
    : `class-${startsAt.toISOString()}-${slugify(title)}-${slugify(room || 'room')}`;

  const sport = detectEventSport(title, 'FITNESS');
  const bits = [
    `Skupinové cvičenie Form Factory FitCamp — ${title}`,
    `${startTime}–${endTime}`,
    room ? `miestnosť: ${room}` : null,
    instructor ? `inštruktor: ${instructor}` : null,
    isReplacement ? 'Náhrada' : null,
    'Rezervuj si miesto na fitcamp.formfactory.sk.',
  ].filter(Boolean);

  return {
    source: 'form-factory',
    externalId,
    title,
    sport,
    sportType: resolveSportType(sport),
    category: 'fitness',
    participationMode: 'participate',
    startsAt,
    city: 'Bratislava',
    venueKey: 'form-factory-fitcamp',
    locationName: room || 'Form Factory FitCamp',
    description: bits.join(' · '),
    sourceUrl: CALENDAR_URL,
    ticketUrl: metaId
      ? `${CALENDAR_URL}?schiid=${encodeURIComponent(metaId)}`
      : CALENDAR_URL,
  };
}

/** Legacy regex path — only if structured cards are missing. */
function scrapeFitCampCalendarTextFallback(
  $: CheerioRoot,
  dayDates: Array<Date | null>,
): NormalizedScrapedEvent[] {
  const CLASS_CHUNK =
    /(\d{1,2}[:.]\d{2})\s*[-–]\s*(\d{1,2}[:.]\d{2})\s+(.+?)(?=(?:\d{1,2}[:.]\d{2}\s*[-–])|$)/g;
  const events: NormalizedScrapedEvent[] = [];
  const seen = new Set<string>();

  $('table tr').each((rowIdx, row) => {
    if (rowIdx === 0) return;
    const cells = $(row).find('td, th');
    if (cells.length < 5) return;

    cells.each((dayIdx, cell) => {
      if (dayIdx > 6) return;
      const day = dayDates[dayIdx];
      if (!day) return;
      const cellText = $(cell).text().replace(/\s+/g, ' ').trim();
      if (!cellText || cellText.length < 8) return;

      CLASS_CHUNK.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = CLASS_CHUNK.exec(cellText)) !== null) {
        const startRaw = match[1];
        const nameRaw = match[3];
        if (!startRaw || !nameRaw) continue;
        const rawName = cleanClassName(nameRaw);
        if (!rawName || rawName.length < 2) continue;
        if (/^n[aá]hrada$/i.test(rawName)) continue;

        const startsAt = parseTimeOnDate(day, startRaw.replace('.', ':'));
        const externalId = `class-${startsAt.toISOString()}-${slugify(rawName)}`;
        if (seen.has(externalId)) continue;
        seen.add(externalId);

        const sport = detectEventSport(rawName, 'FITNESS');
        events.push({
          source: 'form-factory',
          externalId,
          title: rawName,
          sport,
          sportType: resolveSportType(sport),
          category: 'fitness',
          participationMode: 'participate',
          startsAt,
          city: 'Bratislava',
          venueKey: 'form-factory-fitcamp',
          description: `Skupinové cvičenie Form Factory FitCamp — ${rawName}.`,
          sourceUrl: CALENDAR_URL,
          ticketUrl: CALENDAR_URL,
        });
      }
    });
  });

  return events;
}

async function scrapeFormFactoryEventy(): Promise<NormalizedScrapedEvent[]> {
  const html = await fetchHtml(EVENTY_URL);
  const $ = cheerio.load(truncateHtmlForParse(html));
  const drafts: Array<{
    href: string;
    title: string;
    description: string;
    startsAt: Date;
    city: string;
    venueKey: string;
  }> = [];

  const DATE_RE =
    /(\d{1,2}\.\s*\d{1,2}\.\s*\d{4}|\d{1,2}\.\s*[–—-]\s*\d{1,2}\.\s*\d{1,2}\.\s*\d{4}|\d{1,2}\.\s*[–—-]\s*\d{1,2}\.\s*\d{4}|(\d{1,2})\.\s*[–—-]\s*(\d{1,2})\.\s*(\d{4}))/;

  // Also match glued city+date: Bratislava07. – 08. 2026
  function extractDate(text: string): Date | null {
    const glued = text.match(
      /(?:Bratislava|Košice|Žilina|Trenčín)?\s*(\d{1,2})\.\s*[–—-]\s*(\d{1,2})\.\s*(\d{4})/i,
    );
    if (glued) {
      // "07. – 08. 2026" → day 7, month 8, year 2026
      return parseSlovakDate(`${glued[1]}.${glued[2]}.${glued[3]}`);
    }
    const dateMatch = text.match(DATE_RE);
    const dateRaw = dateMatch?.[1] ?? dateMatch?.[0];
    if (!dateRaw) return null;
    return parseSlovakDate(dateRaw);
  }

  $('.wp-block-media-text').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (!text || text.length < 20) return;

    const hrefAttr =
      $(el).find('a[href*="piatkovica"]').first().attr('href') ||
      $(el).find('a[href*="hyrox"]').first().attr('href') ||
      $(el).find('a[href*="formfactory.site/event"]').first().attr('href') ||
      $(el).find('a[href*="formfactory"]').first().attr('href');

    if (!hrefAttr || /\/eventy\/?$/i.test(hrefAttr)) return;

    const startsAt = extractDate(text);
    if (!startsAt) return;

    const title = extractEventTitle(text, $, el);
    const { city, venueKey } = resolveFormFactoryVenue(text, hrefAttr);

    const description = text
      .replace(/^(PIATKOVICA|OPEN AIR LETNÉ SKUPINOVKY|HYROX)\s*/i, '')
      .replace(/REGISTR[AÁ]CIA[\s\S]*$/i, '')
      .replace(/VIAC INFO[\s\S]*$/i, '')
      .replace(/Form Factory[\s\S]*$/i, '')
      .trim()
      .slice(0, 400);

    drafts.push({
      href: absoluteUrl(hrefAttr),
      title,
      description: description || `${title} — Form Factory event.`,
      startsAt,
      city,
      venueKey,
    });
  });

  // Fallback: any piatkovica/hyrox/event link with nearby date in parent text
  if (drafts.length === 0) {
    $('a[href*="piatkovica"], a[href*="hyrox"], a[href*="formfactory.site/event"]').each((_, el) => {
      const href = absoluteUrl($(el).attr('href') ?? '');
      if (!href) return;
      let parent: typeof el.parent = el.parent;
      for (let i = 0; i < 8 && parent; i++) {
        const text = $(parent).text().replace(/\s+/g, ' ').trim();
        const startsAt = extractDate(text);
        if (startsAt && text.length < 800) {
          const { city, venueKey } = resolveFormFactoryVenue(text, href);
          drafts.push({
            href,
            title: extractEventTitle(text, $, parent),
            description: text.slice(0, 300),
            startsAt,
            city,
            venueKey,
          });
          break;
        }
        parent = (parent as { parent?: typeof parent }).parent ?? null;
      }
    });
  }

  const enriched = await Promise.all(
    drafts.slice(0, 20).map(async (draft) => {
      const detail = draft.href.includes('formfactory.sk')
        ? await enrichFromDetail(draft.href)
        : {};
      const startsAt = detail.startsAt ?? draft.startsAt;
      // Prefer listing title (includes venue); OG titles are often just "Piatkovica"
      const title = draft.title;
      const externalId = `event-${slugify(draft.href)}-${startsAt.toISOString().slice(0, 10)}`;

      const sport = detectEventSport(title, 'FITNESS');
      const event: NormalizedScrapedEvent = {
        source: 'form-factory',
        externalId,
        title,
        sport,
        sportType: resolveSportType(sport),
        // HYROX = race/tournament; Open Air + Piatkovica = fitness events (join/register)
        category: /hyrox/i.test(title + draft.href) ? 'tournament' : 'fitness',
        participationMode: inferParticipationMode(
          title,
          draft.description + (detail.description ?? ''),
        ),
        startsAt,
        city: draft.city,
        venueKey: draft.venueKey,
        description: detail.description || draft.description,
        coverUrl: null,
        sourceUrl: draft.href,
        ticketUrl: detail.ticketUrl || draft.href,
        priceCents: /zadarmo|free|0\s*€/i.test(title + draft.description) ? 0 : undefined,
      };
      return event;
    }),
  );

  return enriched;
}

async function enrichFromDetail(url: string): Promise<{
  title?: string;
  description?: string;
  ticketUrl?: string | null;
  startsAt?: Date | null;
}> {
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(truncateHtmlForParse(html));
    const ogTitle = $('meta[property="og:title"]').attr('content')?.trim();
    const ogDesc = $('meta[property="og:description"]').attr('content')?.trim();
    // Intentionally skip og:image — Cover Factory owns visuals (no third-party photos).
    const pageTitle = $('title').text().replace(/\s*[-|].*$/, '').trim();
    const bodyText = $('body').text().replace(/\s+/g, ' ');
    const dateMatch = bodyText.match(/(\d{1,2}\.\s*\d{1,2}\.\s*\d{4})/);
    const startsAt = dateMatch?.[1] ? parseSlovakDate(dateMatch[1]) : null;

    const registerHref =
      $('a')
        .filter((_, a) => /registr|prihl|sign\s*up|ticket|vstupen/i.test($(a).text()))
        .first()
        .attr('href') ?? null;

    return {
      title: ogTitle && ogTitle.toLowerCase() !== 'piatkovica'
        ? ogTitle
        : pageTitle || ogTitle,
      description: ogDesc,
      ticketUrl: registerHref ? absoluteUrl(registerHref) : url,
      startsAt,
    };
  } catch {
    return {};
  }
}

function extractEventTitle(text: string, $: ReturnType<typeof cheerio.load>, el: unknown): string {
  if (/open air|letn[eé]\s+skupinov/i.test(text)) {
    const place = text.match(
      /(SKY PARK|OC Nivy|Partizánska Lúka|Račianske mýto|Farského|BBC|Cassovar|Mirage)[^.]{0,30}/i,
    );
    if (place?.[1]) return `Open Air — ${place[1].trim()}`;
    return 'Open Air Letné skupinové';
  }
  if (/piatkovica/i.test(text)) {
    const venue = text.match(
      /Form Factory\s+([A-ZÁÉÍÓÚÝŽŠČŤŇOC][\wÁÉÍÓÚÝŽŠČŤŇáéíóúýžščťň .-]{1,40}?)(?=Bratislava|Košice|Žilina|Trenčín|\d)/i,
    );
    const venueName = venue?.[1]?.trim();
    if (venueName) return `Piatkovica — ${venueName}`;
    if (/farsk/i.test(text)) return 'Piatkovica — Farského';
    if (/nivy/i.test(text)) return 'Piatkovica — OC Nivy';
    return 'Piatkovica';
  }
  if (/hyrox/i.test(text)) return 'HYROX Form Factory';

  const heading = $(el as never)
    .find('h1, h2, h3, h4, strong')
    .first()
    .text()
    .replace(/\s+/g, ' ')
    .trim();
  if (heading && heading.length >= 3 && heading.length < 80) return heading;
  return text.slice(0, 60).trim();
}

function resolveFormFactoryVenue(
  text: string,
  href: string,
): { city: string; venueKey: string } {
  const hay = `${text} ${href}`.toLowerCase();

  if (/farsk/i.test(hay)) {
    return { city: 'Bratislava', venueKey: 'form-factory-farskeho' };
  }
  if (/nivy/i.test(hay)) {
    return { city: 'Bratislava', venueKey: 'form-factory-nivy' };
  }
  if (/\bbbc\b/i.test(hay)) {
    return { city: 'Bratislava', venueKey: 'form-factory-bbc' };
  }
  if (/sky\s*park/i.test(hay)) {
    return { city: 'Bratislava', venueKey: 'form-factory-fitcamp' };
  }
  if (/partiz[aá]nska|ra[cč]ianske/i.test(hay)) {
    return { city: 'Bratislava', venueKey: 'form-factory-fitcamp' };
  }
  if (/fitcamp|drie[nň]/i.test(hay)) {
    return { city: 'Bratislava', venueKey: 'form-factory-fitcamp' };
  }
  if (/ko[sš]ice|cassovar/i.test(hay)) {
    return { city: 'Košice', venueKey: 'form-factory-cassovar' };
  }
  if (/[zž]ilina|mirage/i.test(hay)) {
    return { city: 'Žilina', venueKey: 'form-factory-mirage' };
  }
  if (/tren[cč][ií]n|oc\s*max/i.test(hay)) {
    return { city: 'Trenčín', venueKey: 'form-factory-trencin' };
  }
  if (/pova[zž]sk[aá]\s*bystrica|bpark/i.test(hay)) {
    return { city: 'Považská Bystrica', venueKey: 'form-factory-bpark' };
  }

  const cityMatch = text.match(
    /\b(Bratislava|Košice|Kosice|Žilina|Zilina|Trenčín|Trencin|Nitra|Banská Bystrica|Prešov|Presov)\b/i,
  );
  const cityRaw = cityMatch?.[1] ?? 'Bratislava';
  const city = cityRaw
    .replace(/Kosice/i, 'Košice')
    .replace(/Zilina/i, 'Žilina')
    .replace(/Trencin/i, 'Trenčín')
    .replace(/Presov/i, 'Prešov');

  if (/bratislava/i.test(city)) {
    return { city: 'Bratislava', venueKey: 'form-factory-fitcamp' };
  }
  return { city, venueKey: 'form-factory-fitcamp' };
}

function inferParticipationMode(title: string, description: string): 'participate' | 'spectator' {
  const hay = `${title} ${description}`.toLowerCase();
  if (/\s(?:vs\.?|versus|proti)\s/.test(hay)) return 'spectator';
  if (/divák|divakov|spectator|sleduj|pozri si zápas|vstupenky na zápas/i.test(hay)) {
    return 'spectator';
  }
  return 'participate';
}

const STUDIO_SUFFIX =
  /\s+(Sála|Sala|Gym|Floor|Spinning|Studio|FC|Box|Outdoor|Vonku|Dráha|Terasa)\s*$/i;

function cleanClassName(raw: string): string {
  return raw
    .replace(/™/g, '')
    .replace(/\bNÁHRADA\b/gi, '')
    .replace(STUDIO_SUFFIX, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function absoluteUrl(href: string): string {
  try {
    return new URL(href, 'https://www.formfactory.sk/').toString();
  } catch {
    return href;
  }
}

function dedupeByExternalId(events: NormalizedScrapedEvent[]): NormalizedScrapedEvent[] {
  const seen = new Set<string>();
  return events.filter((e) => {
    if (seen.has(e.externalId)) return false;
    seen.add(e.externalId);
    return true;
  });
}
