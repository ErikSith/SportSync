/**
 * Reenio Term/List booking adapter (HTTP FormData + XSRF).
 * Date is sent as multipart field `date=YYYY-MM-DD` (not JSON body).
 */
import { detectEventSport } from '@/lib/constants/sports';
import {
  addAppCalendarDays,
  toAppDateKey,
} from '@/lib/datetime/bratislava';
import type { ScrapedEvent } from '../types';
import {
  detectBookingEmbed,
  resolveReenioSubjectFromWidgetCode,
} from './detect-embed';

const UA = 'SportSyncBot/1.0 (+https://sportsync.app; schedule ingest)';
const DEFAULT_DAYS_AHEAD = 7;

export type ScrapeReenioOptions = {
  subject: string;
  /** Host page URL stored as originalUrl / scrape identity. */
  hostUrl: string;
  /** Inclusive start day YYYY-MM-DD (Bratislava calendar). Default: today. */
  fromDay?: string;
  /** Number of calendar days to fetch (default 7). */
  daysAhead?: number;
  locationName?: string;
  city?: string;
};

type ReenioEvent = {
  id: number;
  start: string;
  end: string;
  note?: string | null;
  maxCapacity?: number;
  reservations?: Array<{ capacity?: number }>;
  priceVariants?: Array<{ price?: number; symbol?: string; code?: string }>;
  eventResources?: Array<{
    name?: string | null;
    service?: { name?: string | null } | null;
    employee?: { name?: string | null } | null;
    place?: { name?: string | null } | null;
  }>;
};

type CookieJar = Map<string, string>;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function politeDelay() {
  return sleep(1500 + Math.random() * 2000);
}

function originFor(subject: string) {
  return `https://${subject}.reenio.sk`;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function mergeSetCookie(jar: CookieJar, res: Response) {
  const anyHeaders = res.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const list =
    typeof anyHeaders.getSetCookie === 'function'
      ? anyHeaders.getSetCookie()
      : (() => {
          const raw = res.headers.get('set-cookie');
          return raw ? [raw] : [];
        })();
  for (const line of list) {
    const part = line.split(';')[0];
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    jar.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
  }
}

function cookieHeader(jar: CookieJar): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function xsrfFromJar(jar: CookieJar): string | null {
  // ASP.NET Antiforgery cookie name varies; Reenio uses XSRF-TOKEN style.
  for (const [k, v] of jar) {
    if (/xsrf|antiforgery|requestverificationtoken/i.test(k)) {
      try {
        return decodeURIComponent(v);
      } catch {
        return v;
      }
    }
  }
  return null;
}

function todayBratislavaYmd(): string {
  // Europe/Bratislava calendar day via Intl
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Bratislava',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
}

async function bootstrapSession(
  subject: string,
  jar: CookieJar,
): Promise<{ version: string }> {
  const origin = originFor(subject);
  const res = await fetch(`${origin}/sk/terms`, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  });
  mergeSetCookie(jar, res);
  const html = await res.text();
  const ver =
    html.match(/X-Reenio-Version["']?\s*[:=]\s*["']?(\d+)/i)?.[1] ||
    html.match(/reenio[^0-9]*(\d{4})/i)?.[1] ||
    '3209';
  return { version: ver };
}

async function fetchTermListDay(
  subject: string,
  day: string,
  jar: CookieJar,
  version: string,
): Promise<ReenioEvent[]> {
  const origin = originFor(subject);
  const referer = `${origin}/sk/terms/${day};viewMode=1-day`;

  // Warm cookies / antiforgery for the day route (SPA shell).
  const pageRes = await fetch(referer, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html',
      Cookie: cookieHeader(jar),
    },
    redirect: 'follow',
  });
  mergeSetCookie(jar, pageRes);
  await pageRes.arrayBuffer();

  const xsrf = xsrfFromJar(jar);
  const form = new FormData();
  form.set('date', day);
  form.set('viewMode', '1-day');
  form.set('page', '0');
  form.set('includeColors', 'false');
  form.set('findNearestAvailable', 'false');

  const headers: Record<string, string> = {
    'User-Agent': UA,
    Accept: 'application/json, text/plain, */*',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Reenio-Version': version,
    Origin: origin,
    Referer: referer,
    Cookie: cookieHeader(jar),
  };
  if (xsrf) headers['X-XSRF-TOKEN'] = xsrf;

  const apiRes = await fetch(`${origin}/sk/api/Term/List`, {
    method: 'POST',
    headers,
    body: form,
  });
  mergeSetCookie(jar, apiRes);
  if (!apiRes.ok) {
    throw new Error(`Reenio Term/List ${apiRes.status} for ${day}`);
  }
  const json = (await apiRes.json()) as {
    status?: string;
    data?: { events?: ReenioEvent[]; startDate?: string; endDate?: string };
  };
  return json.data?.events ?? [];
}

function mapEvent(
  e: ReenioEvent,
  opts: { hostUrl: string; locationName: string; city: string },
): ScrapedEvent {
  const res = e.eventResources?.[0];
  const title = (res?.service?.name || res?.name || 'Lekcia').trim();
  const instructor = res?.employee?.name?.trim() || null;
  const place = res?.place?.name?.trim();
  const price =
    e.priceVariants?.[0]?.price != null
      ? `${e.priceVariants[0].price} ${e.priceVariants[0].symbol || '€'}`.trim()
      : null;
  const note = e.note ? decodeHtml(e.note).slice(0, 280) : null;
  const desc = [
    instructor ? `Lektor: ${instructor}` : null,
    e.maxCapacity != null ? `Kapacita: ${e.maxCapacity}` : null,
    note,
  ]
    .filter(Boolean)
    .join('. ');

  const sport = detectEventSport(`${title} joga`);

  return {
    title,
    sportType: sport === 'OTHER' ? 'Joga' : sport,
    isTournament: false,
    isGroupClass: true,
    isForWomenOnly: /pre ženy|ženám|\blad(y|ies)\b/i.test(title),
    isForKids: /deti|kids|junior|baby/i.test(title),
    ageCategory: null,
    startTime: e.start,
    timeKnown: true,
    endTime: e.end,
    locationName: place
      ? opts.locationName && !opts.locationName.includes(place)
        ? `${place}, ${opts.locationName}`
        : place
      : opts.locationName,
    city: opts.city,
    priceText: price,
    description: desc || null,
    originalUrl: opts.hostUrl,
  };
}

/**
 * Resolve Reenio subject from admin override, HTML embed, or widget code.
 */
export async function resolveReenioSubject(opts: {
  bookingSubject?: string | null;
  html?: string | null;
}): Promise<string | null> {
  const fromAdmin = opts.bookingSubject?.trim().toLowerCase();
  if (fromAdmin) return fromAdmin;

  if (!opts.html) return null;
  const embed = detectBookingEmbed(opts.html);
  if (!embed || embed.provider !== 'reenio') return null;
  if (embed.subject) return embed.subject;
  if ('widgetCode' in embed && embed.widgetCode) {
    return resolveReenioSubjectFromWidgetCode(embed.widgetCode);
  }
  return null;
}

/**
 * Scrape N calendar days of Reenio terms into ScrapedEvent[].
 */
export async function scrapeReenioTerms(
  opts: ScrapeReenioOptions,
): Promise<ScrapedEvent[]> {
  const subject = opts.subject.trim().toLowerCase();
  if (!subject) throw new Error('Reenio subject is empty');

  const from = opts.fromDay ?? todayBratislavaYmd();
  const days = Math.max(1, Math.min(opts.daysAhead ?? DEFAULT_DAYS_AHEAD, 31));
  const locationName = opts.locationName?.trim() || subject.toUpperCase();
  const city = opts.city?.trim() || 'Bratislava';

  const jar: CookieJar = new Map();
  const { version } = await bootstrapSession(subject, jar);

  const all: ScrapedEvent[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < days; i++) {
    const day = i === 0 ? from : addAppCalendarDays(from, i);
    if (i > 0) await politeDelay();
    const events = await fetchTermListDay(subject, day, jar, version);
    for (const e of events) {
      const scraped = mapEvent(e, {
        hostUrl: opts.hostUrl,
        locationName,
        city,
      });
      // Keep only events whose Bratislava calendar day matches requested day.
      const localKey = toAppDateKey(new Date(e.start));
      if (localKey !== day) continue;
      const dedupe = `${scraped.startTime}|${scraped.title}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      all.push(scraped);
    }
  }

  return all;
}

export { DEFAULT_DAYS_AHEAD, todayBratislavaYmd };
