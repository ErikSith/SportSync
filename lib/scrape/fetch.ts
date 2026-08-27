import type { AdapterResult, NormalizedScrapedEvent } from '@/lib/scrape/types';
import { SCRAPE_ETHICS } from '@/lib/scrape/ethics';
import {
  getZonedParts,
  SCRAPE_DEFAULT_LOCAL_HOUR,
  startOfAppDay,
  zonedLocalDateTime,
} from '@/lib/datetime/bratislava';

const UA = SCRAPE_ETHICS.userAgent;

/** Hard cap on HTML bytes passed to Cheerio — prevents CPU blow-ups on huge pages. */
export const MAX_HTML_BYTES = 500_000;

/** Wall-clock limit for fetch (+ host slot wait) of a single URL. */
export const URL_PROCESS_TIMEOUT_MS = 10_000;

const FETCH_TIMEOUT_MS = 8_000;
export const MAX_LOOP_ITERATIONS = 500;

/** Per-host last request timestamp — min gap 2–3s to avoid overloading venue servers. */
const hostLastRequestAt = new Map<string, number>();
const MIN_HOST_DELAY_MS = SCRAPE_ETHICS.hostDelayMs.min;
const MAX_HOST_DELAY_MS = SCRAPE_ETHICS.hostDelayMs.max;

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return 'unknown';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class UrlProcessingTimeoutError extends Error {
  readonly label: string;

  constructor(label: string, ms = URL_PROCESS_TIMEOUT_MS) {
    super(`URL processing timed out after ${ms}ms: ${label}`);
    this.name = 'UrlProcessingTimeoutError';
    this.label = label;
  }
}

/** Abort waiting after `ms`; does not cancel in-flight sync CPU work (Cheerio). */
export function withUrlProcessingTimeout<T>(
  label: string,
  fn: () => Promise<T>,
  ms = URL_PROCESS_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new UrlProcessingTimeoutError(label, ms));
    }, ms);
    fn()
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export function htmlByteCap(): number {
  // Cheerio on Cloudflare Workers: smaller cap = less CPU. Node scripts keep 500k.
  if (process.env.NEXT_RUNTIME === 'edge') return 180_000;
  return MAX_HTML_BYTES;
}

export function truncateHtmlForParse(rawHtml: string): string {
  const cap = htmlByteCap();
  if (rawHtml.length <= cap) return rawHtml;
  console.warn(`[scrape.fetch] truncating HTML from ${rawHtml.length} to ${cap} bytes`);
  return rawHtml.slice(0, cap);
}

async function waitForHostSlot(host: string): Promise<void> {
  const last = hostLastRequestAt.get(host) ?? 0;
  const gap =
    MIN_HOST_DELAY_MS + Math.floor(Math.random() * (MAX_HOST_DELAY_MS - MIN_HOST_DELAY_MS + 1));
  const wait = last + gap - Date.now();
  if (wait > 0) await sleep(wait);
  hostLastRequestAt.set(host, Date.now());
}

/**
 * Fetch HTML only (text). Never follows image assets.
 * Rate-limits by domain (2–3s between requests to the same host).
 * Hard-capped at {@link URL_PROCESS_TIMEOUT_MS} per URL; HTML truncated before return.
 */
export async function fetchHtml(url: string): Promise<string> {
  return withUrlProcessingTimeout(url, () => fetchHtmlOnce(url));
}

async function fetchHtmlOnce(url: string): Promise<string> {
  const host = hostFromUrl(url);
  await waitForHostSlot(host);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'sk-SK,sk;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    // Text only — never follow image assets from the document.
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType && !/text\/html|application\/xhtml|text\/plain|application\/xml/i.test(contentType)) {
      throw new Error(`Unexpected content-type ${contentType} for ${url}`);
    }
    const rawHtml = await res.text();
    return truncateHtmlForParse(rawHtml);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Timeout fetching ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function bratislavaDateAtDefaultHour(
  year: number,
  monthIndex: number,
  day: number,
): Date | null {
  const d = zonedLocalDateTime(year, monthIndex, day, SCRAPE_DEFAULT_LOCAL_HOUR, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Parse Slovak-ish dates like 1.8.2026, 01.08.2026, 7. 8. 2026, 1. augusta 2026 */
export function parseSlovakDate(raw: string, fallbackYear = new Date().getFullYear()): Date | null {
  const cleaned = raw.trim().replace(/\s+/g, ' ');

  // ISO first — otherwise 2019-12-31 is misread as day=19, month=12, year=31 → 2031.
  const iso = cleaned.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (year >= 2024 && year <= 2030 && month >= 1 && month <= 12) {
      return bratislavaDateAtDefaultHour(year, month - 1, day);
    }
    return null;
  }

  const numeric = cleaned.match(/(\d{1,2})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{2,4})/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    let year = Number(numeric[3]);
    if (year < 100) year += 2000;
    return bratislavaDateAtDefaultHour(year, month - 1, day);
  }

  const dayRange = cleaned.match(
    /(\d{1,2})\s*\.\s*[–—-]\s*(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/,
  );
  if (dayRange) {
    const day = Number(dayRange[1]);
    const month = Number(dayRange[3]);
    const year = Number(dayRange[4]);
    return bratislavaDateAtDefaultHour(year, month - 1, day);
  }

  const compactRange = cleaned.match(/(\d{1,2})\s*\.\s*[–—-]\s*(\d{1,2})\s*\.\s*(\d{4})/);
  if (compactRange) {
    const day = Number(compactRange[1]);
    const month = Number(compactRange[2]);
    const year = Number(compactRange[3]);
    return bratislavaDateAtDefaultHour(year, month - 1, day);
  }

  const months: Record<string, number> = {
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
    julj: 6,
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

  const named = cleaned
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .match(/(\d{1,2})\.?\s*([a-z]+)\s*(\d{4})?/);
  if (named) {
    const day = Number(named[1]);
    const monthName = named[2] ?? '';
    const monthKey = monthName.replace(/j$/, '');
    const month = months[monthName] ?? months[monthKey] ?? months[`${monthName}a`];
    if (month === undefined) return null;
    const year = named[3] ? Number(named[3]) : fallbackYear;
    return bratislavaDateAtDefaultHour(year, month, day);
  }

  return null;
}

/** Apply HH:MM as Europe/Bratislava wall time on the calendar day of `date`. */
export function parseTimeOnDate(date: Date, timeRaw: string | null | undefined): Date {
  if (!timeRaw) return date;
  const m = timeRaw.match(/(\d{1,2})[:.](\d{2})/);
  if (!m) return date;
  const parts = getZonedParts(date);
  return zonedLocalDateTime(
    parts.year,
    parts.month - 1,
    parts.day,
    Number(m[1]),
    Number(m[2]),
    0,
  );
}

export function parsePriceCents(text: string): number | undefined {
  if (/zadarmo|free|0\s*€/i.test(text)) return 0;
  const m = text.match(/(\d+)(?:[,.](\d{1,2}))?\s*€/);
  if (!m) return undefined;
  const euros = Number(m[1]);
  const cents = m[2] ? Number(m[2].padEnd(2, '0').slice(0, 2)) : 0;
  return euros * 100 + cents;
}

export function upcomingOnly(events: NormalizedScrapedEvent[]): NormalizedScrapedEvent[] {
  const now = Date.now() - 60 * 60 * 1000;
  return events.filter((e) => e.startsAt.getTime() >= now);
}

/** Keep everything from start of today (Bratislava) — for dense same-day schedules. */
export function fromTodayOnward(events: NormalizedScrapedEvent[]): NormalizedScrapedEvent[] {
  const start = startOfAppDay().getTime();
  return events.filter((e) => e.startsAt.getTime() >= start);
}

export type OkResultRetain = 'upcoming' | 'from-today' | 'all';

/**
 * Wrap adapter success.
 * - `upcoming` (default): drop slots older than ~1h — for one-off matches/events
 * - `from-today`: keep whole Bratislava calendar day — for studio rozvrh cards
 * - `all`: keep every parsed slot (published week grids)
 */
export function okResult(
  source: AdapterResult['source'],
  events: NormalizedScrapedEvent[],
  retain: OkResultRetain = 'upcoming',
): AdapterResult {
  if (retain === 'all') return { source, events };
  if (retain === 'from-today') return { source, events: fromTodayOnward(events) };
  return { source, events: upcomingOnly(events) };
}

export function errResult(source: AdapterResult['source'], error: unknown): AdapterResult {
  const message = error instanceof Error ? error.message : String(error);
  return { source, events: [], error: message };
}
