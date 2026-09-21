/**
 * Deterministic multi-day festival/tournament date ranges.
 *
 * LLM extractors often keep only the first day ("Št 5") from copy like
 * "5 novembra - 9 novembra". This module re-reads the page text and fills
 * endTime so scrapes cannot drop the range again.
 */

import { toAppDateKey, zonedLocalDateTime } from '@/lib/datetime/bratislava';
import { dateOnlySortInstant } from './date-only-time';
import type { ScrapedEvent } from './types';

const MONTH_WORD =
  'janu[aá]r\\w*|febru[aá]r\\w*|marc\\w*|apr[ií]l\\w*|m[aá]j\\w*|j[uú]n\\w*|j[uú]l\\w*|august\\w*|septembr\\w*|okt[oó]br\\w*|novembr\\w*|decembr\\w*';

const MONTH_INDEX: Record<string, number> = {
  januar: 0,
  januara: 0,
  februar: 1,
  februara: 1,
  marec: 2,
  marca: 2,
  april: 3,
  aprila: 3,
  maj: 4,
  maja: 4,
  jun: 5,
  juna: 5,
  jul: 6,
  jula: 6,
  august: 7,
  augusta: 7,
  september: 8,
  septembra: 8,
  oktober: 9,
  oktobra: 9,
  november: 10,
  novembra: 10,
  december: 11,
  decembra: 11,
};

export type MultiDayRange = {
  start: Date;
  end: Date;
  /** Character offset of the match in the source text (for title proximity). */
  index: number;
};

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function monthIndex(raw: string): number | null {
  const key = fold(raw).replace(/j$/, '');
  const hit =
    MONTH_INDEX[fold(raw)] ?? MONTH_INDEX[key] ?? MONTH_INDEX[`${key}a`];
  return hit === undefined ? null : hit;
}

function noonOn(year: number, monthIndex0: number, day: number): Date {
  return zonedLocalDateTime(year, monthIndex0, day, 12, 0, 0);
}

function hasLaterEndDay(event: ScrapedEvent): boolean {
  if (!event.endTime) return false;
  const startKey = toAppDateKey(new Date(event.startTime));
  const endKey = toAppDateKey(new Date(event.endTime));
  return Boolean(startKey && endKey && endKey > startKey);
}

/**
 * Pull multi-day ranges from listing copy (Latinky, festival calendars, etc.).
 */
export function parseMultiDayRangesFromText(
  text: string,
  fallbackYear = new Date().getFullYear(),
): MultiDayRange[] {
  const out: MultiDayRange[] = [];
  const push = (start: Date | null, end: Date | null, index: number) => {
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return;
    }
    if (toAppDateKey(end) <= toAppDateKey(start)) return;
    // Guard absurd spans (scraped price tables / opening hours).
    const days =
      (Date.UTC(
        Number(toAppDateKey(end).slice(0, 4)),
        Number(toAppDateKey(end).slice(5, 7)) - 1,
        Number(toAppDateKey(end).slice(8, 10)),
      ) -
        Date.UTC(
          Number(toAppDateKey(start).slice(0, 4)),
          Number(toAppDateKey(start).slice(5, 7)) - 1,
          Number(toAppDateKey(start).slice(8, 10)),
        )) /
      86_400_000;
    if (days > 21) return;
    out.push({ start, end, index });
  };

  // "5 novembra - 9 novembra" / "11 februára, 2027 - 15 februára, 2027"
  const namedBoth = new RegExp(
    `(\\d{1,2})\\.?\\s*(${MONTH_WORD})(?:\\s*,?\\s*(\\d{4}))?\\s*[-–—]\\s*(\\d{1,2})\\.?\\s*(${MONTH_WORD})(?:\\s*,?\\s*(\\d{4}))?`,
    'gi',
  );
  for (const m of text.matchAll(namedBoth)) {
    const startMonth = monthIndex(m[2] ?? '');
    const endMonth = monthIndex(m[5] ?? '');
    if (startMonth == null || endMonth == null) continue;
    const startYear = m[3] ? Number(m[3]) : fallbackYear;
    const endYear = m[6] ? Number(m[6]) : startYear;
    push(
      noonOn(startYear, startMonth, Number(m[1])),
      noonOn(endYear, endMonth, Number(m[4])),
      m.index ?? 0,
    );
  }

  // "5.–9. novembra" / "5-9 november 2026"
  const compactNamed = new RegExp(
    `(\\d{1,2})\\.?\\s*[-–—]\\s*(\\d{1,2})\\.?\\s+(${MONTH_WORD})(?:\\s*,?\\s*(\\d{4}))?`,
    'gi',
  );
  for (const m of text.matchAll(compactNamed)) {
    const month = monthIndex(m[3] ?? '');
    if (month == null) continue;
    const year = m[4] ? Number(m[4]) : fallbackYear;
    push(noonOn(year, month, Number(m[1])), noonOn(year, month, Number(m[2])), m.index ?? 0);
  }

  // "5.11.–9.11.2026" / "24. 10. - 25. 10. 2026"
  const numericFull = /(\d{1,2})\s*\.\s*(\d{1,2})\s*\.?(?:\s*(\d{4}))?\s*[-–—]\s*(\d{1,2})\s*\.\s*(\d{1,2})\s*\.?(?:\s*(\d{4}))?/gi;
  for (const m of text.matchAll(numericFull)) {
    const startYear = m[3] ? Number(m[3]) : m[6] ? Number(m[6]) : fallbackYear;
    const endYear = m[6] ? Number(m[6]) : startYear;
    push(
      noonOn(startYear, Number(m[2]) - 1, Number(m[1])),
      noonOn(endYear, Number(m[5]) - 1, Number(m[4])),
      m.index ?? 0,
    );
  }

  // "5.–9.11." / "5-9.11.2026"
  const numericCompact = /(\d{1,2})\s*\.?\s*[-–—]\s*(\d{1,2})\s*\.\s*(\d{1,2})\s*\.?(?:\s*(\d{4}))?/gi;
  for (const m of text.matchAll(numericCompact)) {
    const year = m[4] ? Number(m[4]) : fallbackYear;
    const month = Number(m[3]) - 1;
    push(noonOn(year, month, Number(m[1])), noonOn(year, month, Number(m[2])), m.index ?? 0);
  }

  return out;
}

function titleIndexInText(text: string, title: string): number {
  const foldedText = fold(text);
  const foldedTitle = fold(title);
  if (foldedTitle.length < 4) return -1;
  const idx = foldedText.indexOf(foldedTitle);
  if (idx >= 0) return idx;
  // Soft: first 24 significant chars of title
  const head = foldedTitle.slice(0, Math.min(24, foldedTitle.length));
  if (head.length >= 8) return foldedText.indexOf(head);
  return -1;
}

function findRangeForEvent(
  event: ScrapedEvent,
  text: string,
  ranges: MultiDayRange[],
): MultiDayRange | null {
  if (ranges.length === 0) return null;
  const startKey = toAppDateKey(new Date(event.startTime));
  const titleAt = titleIndexInText(text, event.title);

  // 1) Range whose start day matches the event start (typical LLM first-day keep).
  const byStartDay = ranges.filter((r) => toAppDateKey(r.start) === startKey);
  if (byStartDay.length === 1) return byStartDay[0]!;
  if (byStartDay.length > 1 && titleAt >= 0) {
    return byStartDay.reduce((best, r) =>
      Math.abs(r.index - titleAt) < Math.abs(best.index - titleAt) ? r : best,
    );
  }
  if (byStartDay.length > 1) return byStartDay[0]!;

  // 2) Range printed near the title (Latinky: title then "5 novembra - 9 novembra").
  if (titleAt >= 0) {
    const near = ranges
      .filter((r) => r.index >= titleAt - 40 && r.index <= titleAt + 280)
      .sort((a, b) => Math.abs(a.index - titleAt) - Math.abs(b.index - titleAt));
    if (near[0]) return near[0];
  }

  // 3) Event start falls inside a range (LLM picked a middle day incorrectly).
  const containing = ranges.filter((r) => {
    const a = toAppDateKey(r.start);
    const b = toAppDateKey(r.end);
    return startKey >= a && startKey <= b;
  });
  if (containing.length === 1) return containing[0]!;
  if (containing.length > 1 && titleAt >= 0) {
    return containing.reduce((best, r) =>
      Math.abs(r.index - titleAt) < Math.abs(best.index - titleAt) ? r : best,
    );
  }

  return null;
}

/**
 * Fill missing multi-day endTime from page text. Never invents clocks —
 * end is noon on the last calendar day (date-only sort anchor).
 */
export function applyMultiDayDateRanges(
  cleanText: string,
  events: ScrapedEvent[],
): ScrapedEvent[] {
  if (!cleanText.trim() || events.length === 0) return events;
  const yearHint = (() => {
    const y = cleanText.match(/\b(202[6-9]|203[0-5])\b/);
    return y ? Number(y[1]) : new Date().getFullYear();
  })();
  const ranges = parseMultiDayRangesFromText(cleanText, yearHint);
  if (ranges.length === 0) return events;

  return events.map((event) => {
    if (hasLaterEndDay(event)) return event;
    const matched = findRangeForEvent(event, cleanText, ranges);
    if (!matched) return event;

    const startNoon = dateOnlySortInstant(matched.start.toISOString());
    const endNoon = dateOnlySortInstant(matched.end.toISOString());
    if (Number.isNaN(endNoon.getTime()) || toAppDateKey(endNoon) <= toAppDateKey(startNoon)) {
      return event;
    }

    // Prefer range start; if LLM already picked a day inside the window, keep that day
    // but always noon (no invented festival clock).
    const eventKey = toAppDateKey(new Date(event.startTime));
    const rangeStartKey = toAppDateKey(startNoon);
    const rangeEndKey = toAppDateKey(endNoon);
    const startIso =
      eventKey >= rangeStartKey && eventKey <= rangeEndKey
        ? dateOnlySortInstant(event.startTime).toISOString()
        : startNoon.toISOString();

    return {
      ...event,
      startTime: Number.isNaN(Date.parse(startIso)) ? startNoon.toISOString() : startIso,
      timeKnown: false,
      endTime: endNoon.toISOString(),
    };
  });
}
