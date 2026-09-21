/**
 * Detect date-only calendar lines (e.g. "26.9. Rozlúčka so sezónou")
 * so scrapers do not invent a fake HH:MM for the feed.
 */

import { toAppDateKey, zonedLocalDateTime } from '@/lib/datetime/bratislava';
import type { ScrapedEvent } from './types';

const TIME_RANGE = /(\d{1,2})\s*[.:]\s*(\d{2})/;

const DATE_LINE =
  /(?:^|\n)\s*(\d{1,2})\s*\.\s*(\d{1,2})\s*\.?(?:\s*(\d{4}))?\s+([^\n]+)/g;

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Noon Bratislava — sort anchor only when the source has no clock. */
export function dateOnlySortInstant(fromIso: string): Date {
  const d = new Date(fromIso);
  if (Number.isNaN(d.getTime())) return d;
  const key = toAppDateKey(d);
  const [y, m, day] = key.split('-').map(Number);
  return zonedLocalDateTime(y!, m! - 1, day!, 12, 0, 0);
}

/**
 * Titles that appear on a `D.M. …` line without HH:MM on that same line.
 */
export function dateOnlyTitlesFromText(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(DATE_LINE)) {
    const body = (m[4] ?? '').replace(/\s+/g, ' ').trim();
    if (!body || TIME_RANGE.test(body)) continue;
    // Skip multi-day ranges glued into body ("-1.11 Jesenné…")
    if (/^\s*[-–—]\s*\d/.test(body)) continue;
    const title = body
      .replace(/^ukon[cč]enie\s+(letnej|zimnej)\s+sez[oó]ny\.?\s*/i, '')
      .trim();
    if (title.length >= 3) out.add(fold(title));
  }
  return out;
}

function titleMatchesDateOnly(eventTitle: string, dateOnly: Set<string>): boolean {
  const t = fold(eventTitle);
  if (!t) return false;
  for (const line of dateOnly) {
    if (line === t) return true;
    if (line.includes(t) || t.includes(line)) return true;
    // First significant tokens (ignore very short)
    const lineHead = line.slice(0, Math.min(28, line.length));
    if (lineHead.length >= 8 && t.includes(lineHead)) return true;
  }
  return false;
}

/**
 * Force timeKnown=false (+ noon sort instant) when the page lists the event as a
 * date-only calendar row. Preserves multi-day festival endTime (5.–9. novembra).
 * Dedupes same title+day.
 */
export function applyDateOnlyTimeUnknown(
  cleanText: string,
  events: ScrapedEvent[],
): ScrapedEvent[] {
  const dateOnly = dateOnlyTitlesFromText(cleanText);
  if (dateOnly.size === 0 && events.every((e) => e.timeKnown !== false)) {
    return events;
  }

  const mapped = events.map((event) => {
    const explicitFalse = event.timeKnown === false;
    const fromCalendar = titleMatchesDateOnly(event.title, dateOnly);
    if (!explicitFalse && !fromCalendar) {
      return { ...event, timeKnown: event.timeKnown !== false };
    }
    const noon = dateOnlySortInstant(event.startTime);
    const startIso = Number.isNaN(noon.getTime())
      ? event.startTime
      : noon.toISOString();
    // Keep multi-day festival ends ("5.–9. novembra"); drop same-day clock ends.
    let endTime: string | null = null;
    if (event.endTime) {
      const endNoon = dateOnlySortInstant(event.endTime);
      if (
        !Number.isNaN(endNoon.getTime()) &&
        toAppDateKey(endNoon) > toAppDateKey(new Date(startIso))
      ) {
        endTime = endNoon.toISOString();
      }
    }
    return {
      ...event,
      timeKnown: false,
      startTime: startIso,
      endTime,
    };
  });

  // One card per title + calendar day when time is unknown.
  const seen = new Set<string>();
  const out: ScrapedEvent[] = [];
  for (const event of mapped) {
    if (event.timeKnown === false) {
      const day = toAppDateKey(new Date(event.startTime));
      const key = `${day}|${fold(event.title)}`;
      if (seen.has(key)) continue;
      seen.add(key);
    }
    out.push(event);
  }
  return out;
}
