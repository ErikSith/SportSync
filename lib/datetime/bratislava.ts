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

function readZonedParts(date: Date, timeZone: string = APP_TIMEZONE): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
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

export function formatAppTime(
  date: Date,
  options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  },
  locale = 'en-GB',
): string {
  return date.toLocaleTimeString(locale, { ...options, timeZone: APP_TIMEZONE });
}

export function formatAppDateTime(
  date: Date,
  options: Intl.DateTimeFormatOptions,
  locale = 'en-GB',
): string {
  return date.toLocaleString(locale, { ...options, timeZone: APP_TIMEZONE });
}

/** Relative day label for event tabs/lists (Dnes / Zajtra / short weekday). */
export function formatAppDayLabel(date: Date, locale = 'sk-SK'): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const dayKey = (value: Date) =>
    value.toLocaleDateString('en-CA', { timeZone: APP_TIMEZONE });

  if (dayKey(date) === dayKey(now)) return 'Dnes';
  if (dayKey(date) === dayKey(tomorrow)) return 'Zajtra';
  return formatAppDate(date, { weekday: 'short', day: 'numeric' }, locale);
}
