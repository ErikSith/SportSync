/** SportSync display + scrape wall-clock zone (Slovakia). */
export const APP_TIMEZONE = 'Europe/Bratislava';

/** Default local hour when a scraped listing has a date but no time. */
export const SCRAPE_DEFAULT_LOCAL_HOUR = 17;

type ZonedParts = {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function readZonedParts(date: Date, timeZone: string = APP_TIMEZONE): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    // hourCycle is more reliable than hour12 across iOS Safari / Android WebView.
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '0';

  let hour = Number(get('hour'));
  // Some engines emit "24" for midnight.
  if (hour === 24) hour = 0;

  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour,
    minute: Number(get('minute')),
    second: Number(get('second')),
  };
}

/** Bratislava calendar day key YYYY-MM-DD (device timezone independent). */
export function toAppDateKey(date: Date, timeZone: string = APP_TIMEZONE): string {
  const p = readZonedParts(date, timeZone);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

/** Midnight at the start of the current Bratislava calendar day. */
export function startOfAppDay(now = new Date(), timeZone: string = APP_TIMEZONE): Date {
  const p = readZonedParts(now, timeZone);
  return zonedLocalDateTime(p.year, p.month - 1, p.day, 0, 0, 0, timeZone);
}

/** Next Bratislava calendar day after `dateKey` (YYYY-MM-DD). */
export function addAppCalendarDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const utc = new Date(Date.UTC(y!, m! - 1, d! + days));
  return `${utc.getUTCFullYear()}-${pad2(utc.getUTCMonth() + 1)}-${pad2(utc.getUTCDate())}`;
}

/**
 * Convert a Europe/Bratislava (or other IANA) wall-clock datetime to a real Instant (Date).
 * Does not treat local hours as UTC.
 */
export function zonedLocalDateTime(
  year: number,
  monthIndex: number, // 0–11
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  timeZone: string = APP_TIMEZONE,
): Date {
  let utcMs = Date.UTC(year, monthIndex, day, hour, minute, second);

  for (let i = 0; i < 4; i++) {
    const asLocal = readZonedParts(new Date(utcMs), timeZone);
    const asUtcMs = Date.UTC(
      asLocal.year,
      asLocal.month - 1,
      asLocal.day,
      asLocal.hour,
      asLocal.minute,
      asLocal.second,
    );
    const desiredMs = Date.UTC(year, monthIndex, day, hour, minute, second);
    const delta = desiredMs - asUtcMs;
    if (delta === 0) break;
    utcMs += delta;
  }

  return new Date(utcMs);
}

export function getZonedParts(date: Date, timeZone: string = APP_TIMEZONE): ZonedParts {
  return readZonedParts(date, timeZone);
}

export function formatAppDate(
  date: Date,
  options: Intl.DateTimeFormatOptions,
  locale = 'en-GB',
): string {
  return date.toLocaleDateString(locale, { ...options, timeZone: APP_TIMEZONE });
}

/**
 * Wall-clock time in Europe/Bratislava as HH:mm.
 * Built from zoned parts — not toLocaleTimeString — so iOS Safari / desktop
 * Chrome cannot disagree on separators or 12h vs 24h.
 */
export function formatAppTime(
  date: Date,
  _options?: Intl.DateTimeFormatOptions,
  _locale?: string,
): string {
  const p = readZonedParts(date);
  return `${pad2(p.hour)}:${pad2(p.minute)}`;
}

export function formatAppDateTime(
  date: Date,
  options: Intl.DateTimeFormatOptions,
  locale = 'en-GB',
): string {
  return date.toLocaleString(locale, {
    ...options,
    timeZone: APP_TIMEZONE,
    hourCycle: options.hourCycle ?? 'h23',
  });
}

/** Relative day label for event tabs/lists (Dnes / Zajtra / short weekday). */
export function formatAppDayLabel(date: Date, locale = 'sk-SK'): string {
  const todayKey = toAppDateKey(new Date());
  const eventKey = toAppDateKey(date);
  if (eventKey === todayKey) return 'Dnes';
  if (eventKey === addAppCalendarDays(todayKey, 1)) return 'Zajtra';
  return formatAppDate(date, { weekday: 'short', day: 'numeric' }, locale);
}

/**
 * Parse a DB timestamp into an Instant.
 * Scrapers write `Date.toISOString()` (UTC). Historically `events.starts_at` was
 * `timestamp without time zone`, so PostgREST returned naive `2026-08-19T05:30:00`
 * which JS treats as *local* — shifting Bratislava wall times by the UTC offset.
 * Naive values are therefore interpreted as UTC.
 */
export function parseDbInstant(value: Date | string | null | undefined): Date {
  if (value instanceof Date) return value;
  if (value == null) return new Date(NaN);
  const raw = String(value).trim();
  if (!raw) return new Date(NaN);
  if (/[zZ]$/.test(raw) || /[+-]\d{2}:\d{2}$/.test(raw)) return new Date(raw);
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  return new Date(`${normalized}Z`);
}

/**
 * If copy says "o 7:30" / "každú stredu o 17:00" and the stored Instant's
 * Bratislava wall clock differs, snap to that clock on the same calendar day.
 * Keeps EventListItem time aligned with description / source-page wording.
 */
export function alignStartsAtWithCopyTime(
  startsAt: Date,
  text: string | null | undefined,
): Date {
  if (!text || Number.isNaN(startsAt.getTime())) return startsAt;
  const m = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .match(/\bo\s+(\d{1,2})[:.](\d{2})\b/);
  if (!m) return startsAt;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return startsAt;
  if (hour > 23 || minute > 59) return startsAt;
  const parts = readZonedParts(startsAt);
  if (parts.hour === hour && parts.minute === minute) return startsAt;
  return zonedLocalDateTime(parts.year, parts.month - 1, parts.day, hour, minute, 0);
}
