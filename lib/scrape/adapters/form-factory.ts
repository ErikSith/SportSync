import * as cheerio from 'cheerio';
import { resolveSportType } from '@/lib/ai/theme-config';
import { detectEventSport } from '@/lib/constants/sports';
import {
  errResult,
  fetchHtml,
  okResult,
  parseSlovakDate,
  parseTimeOnDate,
  slugify,
} from '@/lib/scrape/fetch';
import type { AdapterResult, NormalizedScrapedEvent } from '@/lib/scrape/types';

const CALENDAR_URL = 'https://fitcamp.formfactory.sk/calendar';
const EVENTY_URL = 'https://www.formfactory.sk/eventy/';

/** Time range + class name chunks inside a day cell */
const CLASS_CHUNK =
  /(\d{1,2}[:.]\d{2})\s*[-–]\s*(\d{1,2}[:.]\d{2})\s+(.+?)(?=(?:\d{1,2}[:.]\d{2}\s*[-–])|$)/g;

const STUDIO_SUFFIX =
  /\s+(Sála|Sala|Gym|Floor|Spinning|Studio|FC|Box|Outdoor|Vonku)\s*$/i;

export async function scrapeFormFactory(): Promise<AdapterResult> {
  try {
    const [marketing, classes] = await Promise.all([
      scrapeFormFactoryEventy(),
      scrapeFitCampCalendar(),
    ]);
    const merged = dedupeByExternalId([...marketing, ...classes]);
    return okResult('form-factory', merged.slice(0, 80));
  } catch (error) {
    return errResult('form-factory', error);
  }
}

async function scrapeFitCampCalendar(): Promise<NormalizedScrapedEvent[]> {
  const html = await fetchHtml(CALENDAR_URL);
  const $ = cheerio.load(html);
  const events: NormalizedScrapedEvent[] = [];
  const seen = new Set<string>();
  const monday = startOfWeekMonday(new Date());

  // Header row = day names; each following row has Mon…Sun cells with class lists
  $('table tr').each((rowIdx, row) => {
    if (rowIdx === 0) return;
    const cells = $(row).find('td, th');
    if (cells.length < 5) return;

    cells.each((dayIdx, cell) => {
      if (dayIdx > 6) return;
      const cellText = $(cell).text().replace(/\s+/g, ' ').trim();
      if (!cellText || cellText.length < 8) return;

      const day = new Date(monday);
      day.setUTCDate(monday.getUTCDate() + dayIdx);

      let match: RegExpExecArray | null;
      CLASS_CHUNK.lastIndex = 0;
      while ((match = CLASS_CHUNK.exec(cellText)) !== null) {
        const startRaw = match[1];
        const nameRaw = match[3];
        if (!startRaw || !nameRaw) continue;
        const startTime = startRaw.replace('.', ':');
        const rawName = cleanClassName(nameRaw);
        if (!rawName || rawName.length < 2) continue;
        if (/^n[aá]hrada$/i.test(rawName)) continue;

        const startsAt = parseTimeOnDate(day, startTime);
        if (startsAt.getTime() < Date.now() - 3600000) continue;
        if (startsAt.getTime() > Date.now() + 8 * 86400000) continue;

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
          description: `Skupinové cvičenie Form Factory FitCamp — ${rawName}. Rezervuj si miesto a zúčastni sa.`,
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
  const $ = cheerio.load(html);
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
    const $ = cheerio.load(html);
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
  if (/divák|divakov|spectator|sleduj|pozri si zápas|vstupenky na zápas/i.test(hay)) {
    return 'spectator';
  }
  return 'participate';
}

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

function startOfWeekMonday(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setUTCDate(x.getUTCDate() + diff);
  return x;
}

function dedupeByExternalId(events: NormalizedScrapedEvent[]): NormalizedScrapedEvent[] {
  const seen = new Set<string>();
  return events.filter((e) => {
    if (seen.has(e.externalId)) return false;
    seen.add(e.externalId);
    return true;
  });
}
