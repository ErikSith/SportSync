/** Date-range filter for /events (?from=YYYY-MM-DD&to=YYYY-MM-DD).
 * Calendar days are always Europe/Bratislava — same zone as event cards.
 */

import { APP_TIMEZONE, toAppDateKey } from '@/lib/datetime/bratislava';

export type DatePreset = 'all' | 'today' | 'tomorrow' | 'weekend' | 'custom';

export interface EventDateRange {
  from: string | null; // YYYY-MM-DD inclusive (Bratislava)
  to: string | null; // YYYY-MM-DD inclusive (Bratislava)
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function ymd(year: number, month1to12: number, day: number): string {
  return `${year}-${pad(month1to12)}-${pad(day)}`;
}

/** Bratislava calendar day for an Instant (event startsAt, "now", …). */
export function toDateKey(date: Date): string {
  return toAppDateKey(date);
}

/** Stable YYYY-MM-DD from calendar Y/M/D (UI month grid / chip intent). */
export function calendarDateKey(year: number, monthIndex: number, day: number): string {
  return ymd(year, monthIndex + 1, day);
}

export function parseDateKey(key: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return null;
  // Noon local avoids DST edge flips when used only for display/math of Y-M-D.
  const date = new Date(y, m - 1, d, 12, 0, 0);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

/** Add N calendar days to a YYYY-MM-DD key (zone-agnostic). */
export function addCalendarDays(key: string, days: number): string | null {
  if (!parseDateKey(key)) return null;
  const [y, m, d] = key.split('-').map(Number);
  const utc = new Date(Date.UTC(y!, m! - 1, d! + days));
  return ymd(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Monday-based week ending Sunday (Bratislava). */
export function endOfWeek(date: Date): Date {
  const key = toDateKey(date);
  const day = appWeekday(date);
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  const endKey = addCalendarDays(key, daysUntilSunday);
  return parseDateKey(endKey ?? key) ?? date;
}

/** 0 = Sunday … 6 = Saturday in Europe/Bratislava. */
export function appWeekday(date: Date = new Date()): number {
  const wd = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    weekday: 'short',
  }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[wd] ?? 0;
}

/**
 * Upcoming Sat–Sun (Bratislava). If already Sat/Sun, remaining weekend days only.
 */
export function upcomingWeekendRange(now = new Date()): EventDateRange {
  const todayKey = toDateKey(now);
  const day = appWeekday(now);
  const toSat = day === 6 ? 0 : day === 0 ? -1 : 6 - day;
  const satKey = addCalendarDays(todayKey, toSat)!;
  const sunKey = addCalendarDays(satKey, 1)!;
  const from = satKey < todayKey ? todayKey : satKey;
  return { from, to: sunKey };
}

export function parseEventDateRange(params: {
  from?: string;
  to?: string;
}): EventDateRange {
  const from = params.from && parseDateKey(params.from) ? params.from : null;
  let to = params.to && parseDateKey(params.to) ? params.to : null;
  if (from && to && to < from) to = from;
  if (!from && to) return { from: to, to };
  return { from, to: to ?? from };
}

export function resolveDatePreset(range: EventDateRange, now = new Date()): DatePreset {
  if (!range.from) return 'all';
  const today = toDateKey(now);
  const tomorrow = addCalendarDays(today, 1)!;
  const weekend = upcomingWeekendRange(now);
  const to = range.to ?? range.from;

  if (range.from === today && to === today) return 'today';
  if (range.from === tomorrow && to === tomorrow) return 'tomorrow';
  if (weekend.from && weekend.to && range.from === weekend.from && to === weekend.to) {
    return 'weekend';
  }
  return 'custom';
}

export function presetRange(preset: Exclude<DatePreset, 'all' | 'custom'>, now = new Date()): EventDateRange {
  const today = toDateKey(now);
  if (preset === 'today') return { from: today, to: today };
  if (preset === 'tomorrow') {
    const key = addCalendarDays(today, 1)!;
    return { from: key, to: key };
  }
  return upcomingWeekendRange(now);
}

export function matchesEventDateRange(startsAt: Date | string, range: EventDateRange): boolean {
  if (!range.from) return true;
  const instant = startsAt instanceof Date ? startsAt : new Date(startsAt);
  if (Number.isNaN(instant.getTime())) return false;
  const key = toDateKey(instant);
  const to = range.to ?? range.from;
  return key >= range.from && key <= to;
}

export function applyEventDateRange<T>(
  items: T[],
  range: EventDateRange,
  getStartsAt: (item: T) => Date | string,
): T[] {
  if (!range.from) return items;
  return items.filter((item) => matchesEventDateRange(getStartsAt(item), range));
}

export function formatRangeLabel(range: EventDateRange): string {
  if (!range.from) return '';
  const from = parseDateKey(range.from);
  const toKey = range.to ?? range.from;
  const to = parseDateKey(toKey);
  if (!from || !to) return range.from;

  const fmt = (d: Date) =>
    d.toLocaleDateString('sk-SK', { day: 'numeric', month: 'short' });

  if (range.from === toKey) return fmt(from);
  return `${fmt(from)} – ${fmt(to)}`;
}

/** Days in month grid (Mon-first), including leading/trailing padding as null.
 * Cells use local noon so Bratislava date keys stay stable across zones.
 */
export function buildMonthGrid(year: number, monthIndex: number): Array<Date | null> {
  const first = new Date(year, monthIndex, 1, 12, 0, 0);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const mondayOffset = (first.getDay() + 6) % 7;
  const cells: Array<Date | null> = [];
  for (let i = 0; i < mondayOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIndex, d, 12, 0, 0));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function eventDayKeys(startsAts: Array<Date | string>): Set<string> {
  const set = new Set<string>();
  for (const d of startsAts) {
    const instant = d instanceof Date ? d : new Date(d);
    if (!Number.isNaN(instant.getTime())) set.add(toDateKey(instant));
  }
  return set;
}
