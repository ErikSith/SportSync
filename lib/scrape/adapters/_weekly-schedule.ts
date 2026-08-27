/**
 * Shared helpers for weekly studio / academy rozvrh tables.
 * Prefer structured day columns over free-text regex scrapes.
 */

import * as cheerio from 'cheerio';
import { resolveSportType } from '@/lib/ai/theme-config';
import { detectEventSport, type EventSport } from '@/lib/constants/sports';
import { addAppCalendarDays, toAppDateKey, zonedLocalDateTime } from '@/lib/datetime/bratislava';
import { parseTimeOnDate, slugify } from '@/lib/scrape/fetch';
import type {
  NormalizedScrapedEvent,
  ParticipationMode,
  ScrapeAdapterId,
  ScrapeCategory,
} from '@/lib/scrape/types';

type CheerioRoot = ReturnType<typeof cheerio.load>;

const WEEKDAY_HEADER =
  /^(pon|po|pondelok|uto|ut|utorok|str|st|streda|štv|stv|štvrtok|stvrtok|pia|pi|piatok|sob|so|sobota|ned|ne|nede[lľ]a)$/i;

export interface WeeklyScheduleContext {
  source: ScrapeAdapterId;
  venueKey: string;
  city?: string;
  sourceUrl: string;
  sportFallback: string;
  category?: ScrapeCategory;
  participationMode?: ParticipationMode;
  /** Prefix for stable external ids, e.g. `ofa` → `ofa-class-...` */
  idPrefix: string;
  /** How many weeks ahead to materialize (1 = this week only). */
  weeks?: number;
}

/** Monday–Sunday dates for the Bratislava week containing `now` (plus weekOffset). */
export function bratislavaWeekDates(now = new Date(), weekOffset = 0): Date[] {
  const todayKey = toAppDateKey(now);
  const [y, m, d] = todayKey.split('-').map(Number);
  const sample = zonedLocalDateTime(y!, m! - 1, d!, 12, 0, 0);
  const weekdayLong = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Bratislava',
    weekday: 'long',
  }).format(sample);
  const mondayOffset: Record<string, number> = {
    Monday: 0,
    Tuesday: -1,
    Wednesday: -2,
    Thursday: -3,
    Friday: -4,
    Saturday: -5,
    Sunday: -6,
  };
  const monDelta = (mondayOffset[weekdayLong] ?? 0) + weekOffset * 7;
  const mondayKey = addAppCalendarDays(todayKey, monDelta);

  return Array.from({ length: 7 }, (_, i) => {
    const key = addAppCalendarDays(mondayKey, i);
    const [yy, mm, dd] = key.split('-').map(Number);
    return zonedLocalDateTime(yy!, mm! - 1, dd!, 12, 0, 0);
  });
}

function weekdayIndex(label: string): number | null {
  const n = label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (/^(pon|po|pondelok)$/.test(n)) return 0;
  if (/^(uto|ut|utorok)$/.test(n)) return 1;
  if (/^(str|st|streda)$/.test(n)) return 2;
  if (/^(stv|stvrtok|stvr)$/.test(n) || n.startsWith('stvr')) return 3;
  if (/^(pia|pi|piatok)$/.test(n)) return 4;
  if (/^(sob|so|sobota)$/.test(n)) return 5;
  if (/^(ned|ne|nedela)$/.test(n)) return 6;
  return null;
}

/** Parse "MMA kids 16:00" / "05:30–06:30 CrossFit" style chunks. */
export function parseClassTimeTitle(raw: string): { title: string; time: string } | null {
  const text = raw.replace(/\s+/g, ' ').trim();
  if (!text || /^[–—\-·.•]+$/.test(text) || /netrénuje|zrusene|zrušen/i.test(text)) {
    return null;
  }

  // Prefer trailing wall-clock: "BOX/MMA profi heavy 16:30" (greedy title).
  const trailing = text.match(/^(.+)\s+(\d{1,2}[:.]\d{2})\s*$/);
  if (trailing) {
    const title = trailing[1]!.replace(/^[–—\-·.•\s]+/, '').trim();
    if (title.length >= 2 && !/^\d{1,2}[:.]\d{2}/.test(title)) {
      return { title, time: trailing[2]!.replace('.', ':') };
    }
  }

  const leadingRange = text.match(
    /^(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})\s+(.+)$/,
  );
  if (leadingRange) {
    const title = leadingRange[3]!.replace(/\s+/g, ' ').trim();
    if (title.length >= 2) {
      return { title, time: leadingRange[1]!.replace('.', ':') };
    }
  }

  const leadingTime = text.match(/^(\d{1,2}[:.]\d{2})\s+(.+)$/);
  if (leadingTime) {
    const title = leadingTime[2]!.replace(/\s+/g, ' ').trim();
    if (title.length >= 2) {
      return { title, time: leadingTime[1]!.replace('.', ':') };
    }
  }

  return null;
}

function emptyCell(text: string): boolean {
  const t = text.replace(/\s+/g, ' ').trim();
  return !t || /^[–—\-·.•]+$/.test(t) || /^n\/?a$/i.test(t);
}

/**
 * Classic Mon…Sun column table: header weekdays, cells "Title HH:MM".
 * Used by OFA and similar academies.
 */
export function parseDayColumnClassTable(
  $: CheerioRoot,
  table: unknown,
  ctx: WeeklyScheduleContext,
  weekDates: Date[],
): NormalizedScrapedEvent[] {
  const events: NormalizedScrapedEvent[] = [];
  const rows = $(table as never).find('tr').toArray();
  if (rows.length < 2) return events;

  const headerCells = $(rows[0]!)
    .find('th, td')
    .toArray()
    .map((c) => $(c).text().replace(/\s+/g, ' ').trim());

  const colToDay: Array<number | null> = headerCells.map((h) => weekdayIndex(h));
  if (!colToDay.some((d) => d != null)) return events;

  for (const row of rows.slice(1)) {
    $(row)
      .find('th, td')
      .each((ci, cell) => {
        const dayIdx = colToDay[ci];
        if (dayIdx == null) return;
        const day = weekDates[dayIdx];
        if (!day) return;
        const cellText = $(cell).text().replace(/\s+/g, ' ').trim();
        if (emptyCell(cellText)) return;

        // One wall-clock → one class. Only split when multiple HH:MM appear.
        const timeHits = cellText.match(/\d{1,2}[:.]\d{2}/g) ?? [];
        const parts =
          timeHits.length <= 1
            ? [cellText]
            : cellText
                .split(/(?=(?:^|\s)(?:[A-ZÁÉÍÓÚÝŽŠČŤŇ][\wÁÉÍÓÚÝŽŠČŤŇáéíóúýžščťň /+.-]{2,}\s+\d{1,2}[:.]\d{2}))/)
                .map((c) => c.trim())
                .filter(Boolean);

        for (const part of parts.length ? parts : [cellText]) {
          const parsed = parseClassTimeTitle(part);
          if (!parsed) continue;
          events.push(buildWeeklyEvent(ctx, day, parsed.title, parsed.time));
        }
      });
  }

  return events;
}

/**
 * Time-row schedule: first column "HH:MM–HH:MM Title", remaining columns day markers.
 * Used by CrossFit Proton-style grids.
 */
export function parseTimeRowClassTable(
  $: CheerioRoot,
  table: unknown,
  ctx: WeeklyScheduleContext,
  weekDates: Date[],
): NormalizedScrapedEvent[] {
  const events: NormalizedScrapedEvent[] = [];
  const rows = $(table as never).find('tr').toArray();
  if (rows.length < 2) return events;

  const header = $(rows[0]!)
    .find('th, td')
    .toArray()
    .map((c) => $(c).text().replace(/\s+/g, ' ').trim());

  const dayCols: Array<{ col: number; dayIdx: number }> = [];
  header.forEach((h, col) => {
    if (col === 0 && /^čas|time$/i.test(h)) return;
    const idx = weekdayIndex(h);
    if (idx != null) dayCols.push({ col, dayIdx: idx });
  });
  if (dayCols.length === 0) return events;

  for (const row of rows.slice(1)) {
    const cells = $(row).find('th, td').toArray();
    if (cells.length < 2) continue;
    const timeCell = $(cells[0]!).text().replace(/\s+/g, ' ').trim();
    if (!/\d{1,2}[:.]\d{2}/.test(timeCell)) continue;
    const parsed = parseClassTimeTitle(timeCell);
    if (!parsed) continue;

    for (const { col, dayIdx } of dayCols) {
      const cell = cells[col];
      if (!cell) continue;
      const mark = $(cell).text().replace(/\s+/g, ' ').trim();
      if (emptyCell(mark) || /netrénuje/i.test(mark)) continue;
      const day = weekDates[dayIdx];
      if (!day) continue;
      const markParsed = parseClassTimeTitle(mark);
      const title =
        markParsed?.title && !/^(po|ut|st|št|pi|so|ne)\b/i.test(mark)
          ? markParsed.title
          : parsed.title;
      events.push(buildWeeklyEvent(ctx, day, title, parsed.time));
    }
  }

  return events;
}

function buildWeeklyEvent(
  ctx: WeeklyScheduleContext,
  day: Date,
  title: string,
  time: string,
): NormalizedScrapedEvent {
  const startsAt = parseTimeOnDate(day, time);
  const dayKey = toAppDateKey(startsAt);
  const externalId = `${ctx.idPrefix}-class-${dayKey}-${time.replace(':', '')}-${slugify(title)}`;
  const sport = detectEventSport(title, ctx.sportFallback as EventSport);
  return {
    source: ctx.source,
    externalId,
    title,
    sport,
    sportType: resolveSportType(sport),
    category: ctx.category ?? 'fitness',
    participationMode: ctx.participationMode ?? 'participate',
    startsAt,
    city: ctx.city ?? 'Bratislava',
    venueKey: ctx.venueKey,
    description: `Skupinový tréning — ${title} o ${time}. Zdroj: ${ctx.sourceUrl}`,
    sourceUrl: ctx.sourceUrl,
    ticketUrl: ctx.sourceUrl,
  };
}

/** Expand weekly tables in HTML into concrete slots for current (+ optional next) week. */
export function extractWeeklyTablesFromHtml(
  html: string,
  ctx: WeeklyScheduleContext,
): NormalizedScrapedEvent[] {
  const $ = cheerio.load(html);
  const weeks = Math.max(1, Math.min(ctx.weeks ?? 1, 2));
  const out: NormalizedScrapedEvent[] = [];
  const seen = new Set<string>();

  for (let w = 0; w < weeks; w++) {
    const weekDates = bratislavaWeekDates(new Date(), w);
    $('table').each((_, table) => {
      const header = $(table).find('tr').first().text().replace(/\s+/g, ' ').toLowerCase();
      const looksDayCols = /pondelok|utorok|štvrtok|stvrtok|piatok/.test(header);
      const looksTimeRows = /^čas\b|\bčas\b/.test(header) || /pondelok.*utorok/.test(header);

      let batch: NormalizedScrapedEvent[] = [];
      if (looksDayCols && !/^čas\b/i.test(header.trim())) {
        batch = parseDayColumnClassTable($, table, ctx, weekDates);
      } else if (looksTimeRows || /^čas\b/i.test(header.trim())) {
        batch = parseTimeRowClassTable($, table, ctx, weekDates);
      } else if (looksDayCols) {
        batch = parseDayColumnClassTable($, table, ctx, weekDates);
      }

      for (const event of batch) {
        if (seen.has(event.externalId)) continue;
        seen.add(event.externalId);
        out.push(event);
      }
    });
  }

  return out;
}

export { WEEKDAY_HEADER };
