/**
 * Anti-hallucination provenance: prove title/date/time against source page text.
 */

import { toAppDateKey, getZonedParts } from '@/lib/datetime/bratislava';
import type { ScrapedEvent } from './types';
import { dateOnlySortInstant } from './date-only-time';

export type EvidenceFieldStatus = 'found' | 'missing';

export interface SourceEvidenceFields {
  title: EvidenceFieldStatus;
  date: EvidenceFieldStatus;
  time: EvidenceFieldStatus;
}

export interface SourceEvidence {
  sourceUrl: string;
  excerpt: string;
  fields: SourceEvidenceFields;
  textFragment: string;
  scrapedAt: string;
}

const EXCERPT_MAX = 500;
const WINDOW_CHARS = 220;

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Chrome Text Fragment highlight token (first meaningful slice of title). */
export function buildTextFragment(title: string): string {
  const cleaned = title.replace(/\s+/g, ' ').trim().slice(0, 48);
  if (!cleaned) return '';
  return encodeURIComponent(cleaned).replace(/-/g, '%2D');
}

/** URL that asks supporting browsers to highlight the quote on the source page. */
export function sourceUrlWithTextFragment(
  sourceUrl: string,
  textFragment: string | null | undefined,
): string {
  const base = sourceUrl.trim();
  if (!base) return base;
  const frag = (textFragment ?? '').trim();
  if (!frag) return base;
  try {
    const url = new URL(base);
    url.hash = `:~:text=${frag}`;
    return url.toString();
  } catch {
    const bare = base.split('#')[0] ?? base;
    return `${bare}#:~:text=${frag}`;
  }
}

function findTitleIndex(cleanText: string, title: string): number {
  const hay = fold(cleanText);
  const needle = fold(title);
  if (!needle || needle.length < 3) return -1;
  let idx = hay.indexOf(needle);
  if (idx >= 0) return idx;
  // Soften: drop leading "WORKSHOP:" / "TURNAJ:" noise
  let soft = needle.replace(/^(workshop|turnaj|event|lekcia|padelovy turnaj)\s*[:\-–—]?\s*/i, '');
  if (soft.length >= 6) {
    idx = hay.indexOf(soft);
    if (idx >= 0) return idx;
  }
  // Soften: drop trailing " - Sport / venue" Gemini suffixes
  soft = soft.replace(/\s*[-–—|]\s+[a-z0-9áäčďéíľĺňóôŕšťúýž\s]{2,40}$/i, '').trim();
  if (soft.length >= 6) {
    idx = hay.indexOf(soft);
    if (idx >= 0) return idx;
  }
  // First 24 significant chars
  const head = soft.slice(0, 24);
  if (head.length >= 8) {
    idx = hay.indexOf(head);
    if (idx >= 0) return idx;
  }
  // Token overlap: first 2–3 significant words in order
  const tokens = soft.split(' ').filter((t) => t.length >= 3).slice(0, 3);
  if (tokens.length >= 2) {
    const joined = tokens.join(' ');
    idx = hay.indexOf(joined);
    if (idx >= 0) return idx;
  }
  return -1;
}

const WEEKDAY_SK = [
  'nedela',
  'pondelok',
  'utorok',
  'streda',
  'stvrtok',
  'piatok',
  'sobota',
] as const;

/** Weekly class grids list day names, not absolute D.M.YYYY. */
export function looksLikeWeeklySchedule(pageUrl: string, cleanText: string): boolean {
  const path = (() => {
    try {
      return new URL(pageUrl).pathname.toLowerCase();
    } catch {
      return pageUrl.toLowerCase();
    }
  })();
  if (/\/(rozvrh|schedule|calendar|treningy|program)\b/i.test(path)) return true;
  const hay = fold(cleanText);
  const hits = WEEKDAY_SK.filter((d) => hay.includes(d)).length;
  return hits >= 3;
}

function weekdayPatternsForInstant(startsAt: Date): string[] {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Bratislava',
    weekday: 'short',
  })
    .format(startsAt)
    .toLowerCase();
  const map: Record<string, string> = {
    sun: 'nedela',
    mon: 'pondelok',
    tue: 'utorok',
    wed: 'streda',
    thu: 'stvrtok',
    fri: 'piatok',
    sat: 'sobota',
  };
  const sk = map[weekday.slice(0, 3)] ?? map[weekday];
  return sk ? [sk, sk.slice(0, 3)] : [];
}

function excerptAround(cleanText: string, index: number, needleLen: number): string {
  if (index < 0) return '';
  const start = Math.max(0, index - WINDOW_CHARS);
  const end = Math.min(cleanText.length, index + Math.max(needleLen, 24) + WINDOW_CHARS);
  let slice = cleanText.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) slice = `…${slice}`;
  if (end < cleanText.length) slice = `${slice}…`;
  return slice.slice(0, EXCERPT_MAX);
}

function datePatternsForInstant(startsAt: Date): string[] {
  const p = getZonedParts(startsAt);
  const day = String(p.day);
  const dayPad = day.padStart(2, '0');
  const month = String(p.month);
  const monthPad = month.padStart(2, '0');
  const year = String(p.year);
  const skMonths = [
    'januara',
    'februara',
    'marca',
    'aprila',
    'maja',
    'juna',
    'jula',
    'augusta',
    'septembra',
    'oktobra',
    'novembra',
    'decembra',
  ];
  const sk = skMonths[p.month - 1] ?? '';
  return [
    `${day}.${month}.${year}`,
    `${dayPad}.${monthPad}.${year}`,
    `${day}. ${month}. ${year}`,
    `${day}.${month}`,
    `${dayPad}.${monthPad}`,
    `${day}. ${month}`,
    `${day}. ${month}.`,
    `${day}.${month}.`,
    // Loose "27. 9 2026" (space before year, no second dot)
    `${day}. ${month} ${year}`,
    `${day}.${month} ${year}`,
    // Slovak prose: "7. oktobra 2026" / "7.10.2026"
    ...(sk
      ? [
          `${day}. ${sk} ${year}`,
          `${day}.${sk} ${year}`,
          `${day}. ${sk}`,
          `${dayPad}. ${sk} ${year}`,
        ]
      : []),
  ];
}

function timePatternsForInstant(startsAt: Date): string[] {
  const p = getZonedParts(startsAt);
  const h = String(p.hour);
  const hPad = h.padStart(2, '0');
  const m = String(p.minute).padStart(2, '0');
  return [
    `${h}:${m}`,
    `${hPad}:${m}`,
    `${h}.${m}`,
    `${hPad}.${m}`,
    `${h}:${m}`.replace(/^0/, ''),
  ];
}

function patternFoundInWindow(windowText: string, patterns: string[]): boolean {
  const folded = fold(windowText);
  for (const raw of patterns) {
    const p = fold(raw);
    if (!p) continue;
    if (folded.includes(p)) return true;
    // Allow flexible whitespace around dots: 26.9 / 26 . 9
    const flex = escapeRegExp(p).replace(/\\\./g, '\\s*\\.\\s*').replace(/\s+/g, '\\s*');
    try {
      if (new RegExp(flex, 'i').test(folded)) return true;
    } catch {
      // ignore bad regex
    }
  }
  return false;
}

/**
 * Build provenance for one scraped event against the page cleanText.
 */
export function buildSourceEvidence(
  cleanText: string,
  event: Pick<ScrapedEvent, 'title' | 'startTime' | 'originalUrl'>,
  opts?: { sourceUrl?: string; now?: Date },
): SourceEvidence {
  const sourceUrl = (opts?.sourceUrl ?? event.originalUrl).trim();
  const scrapedAt = (opts?.now ?? new Date()).toISOString();
  const textFragment = buildTextFragment(event.title);
  const titleIdx = findTitleIndex(cleanText, event.title);
  const titleStatus: EvidenceFieldStatus = titleIdx >= 0 ? 'found' : 'missing';

  const excerpt =
    titleIdx >= 0
      ? excerptAround(cleanText, titleIdx, fold(event.title).length)
      : cleanText.replace(/\s+/g, ' ').trim().slice(0, EXCERPT_MAX);

  const startsAt = new Date(event.startTime);
  const windowForFields = excerpt || cleanText.slice(0, 2000);

  let dateStatus: EvidenceFieldStatus = 'missing';
  let timeStatus: EvidenceFieldStatus = 'missing';
  if (!Number.isNaN(startsAt.getTime())) {
    const datePatterns = datePatternsForInstant(startsAt);
    const timePatterns = timePatternsForInstant(startsAt);
    dateStatus = patternFoundInWindow(windowForFields, datePatterns) ? 'found' : 'missing';
    // Also accept date anywhere near title in a slightly wider band of cleanText
    if (dateStatus === 'missing' && titleIdx >= 0) {
      const wider = excerptAround(cleanText, titleIdx, fold(event.title).length + 80);
      dateStatus = patternFoundInWindow(wider, datePatterns) ? 'found' : 'missing';
    }
    // Detail pages often put "Dátum eventu" far below the hero title
    if (dateStatus === 'missing') {
      dateStatus = patternFoundInWindow(cleanText.slice(0, 12_000), datePatterns)
        ? 'found'
        : 'missing';
    }
    // Weekly rozvrh: weekday label counts as date grounding
    if (dateStatus === 'missing' && looksLikeWeeklySchedule(sourceUrl, cleanText)) {
      const days = weekdayPatternsForInstant(startsAt);
      if (patternFoundInWindow(cleanText.slice(0, 12_000), days)) {
        dateStatus = 'found';
      }
    }
    timeStatus = patternFoundInWindow(windowForFields, timePatterns) ? 'found' : 'missing';
    if (timeStatus === 'missing' && titleIdx >= 0) {
      const wider = excerptAround(cleanText, titleIdx, fold(event.title).length + 80);
      timeStatus = patternFoundInWindow(wider, timePatterns) ? 'found' : 'missing';
    }
    if (timeStatus === 'missing') {
      timeStatus = patternFoundInWindow(cleanText.slice(0, 12_000), timePatterns)
        ? 'found'
        : 'missing';
    }
  }

  return {
    sourceUrl,
    excerpt,
    fields: { title: titleStatus, date: dateStatus, time: timeStatus },
    textFragment,
    scrapedAt,
  };
}

export type ScrapedEventWithEvidence = ScrapedEvent & {
  sourceExcerpt?: string | null;
  sourceEvidence?: SourceEvidence | null;
};

/**
 * Attach evidence; force timeKnown=false when time missing;
 * skip events whose date is not grounded in the page text (anti-hallucination).
 */
export function applySourceEvidence(
  cleanText: string,
  events: ScrapedEvent[],
  pageUrl: string,
): ScrapedEventWithEvidence[] {
  const out: ScrapedEventWithEvidence[] = [];
  const seen = new Set<string>();

  for (const event of events) {
    const evidence = buildSourceEvidence(cleanText, event, { sourceUrl: pageUrl });

    // Title not on page at all → drop (likely hallucinated listing).
    if (evidence.fields.title === 'missing') {
      console.warn(
        `[scraper.evidence] skip (title not in page): ${event.title} @ ${pageUrl}`,
      );
      continue;
    }

    // Date not grounded → skip inventing a calendar day.
    // Weekly schedules are the exception: title + clock on the page is enough
    // (absolute D.M. is projected from weekday by the extractor).
    const weekly =
      evidence.fields.date === 'missing' &&
      looksLikeWeeklySchedule(pageUrl, cleanText) &&
      evidence.fields.time === 'found';
    if (evidence.fields.date === 'missing' && !weekly) {
      console.warn(
        `[scraper.evidence] skip (date not in page near title): ${event.title} @ ${pageUrl}`,
      );
      continue;
    }

    let next: ScrapedEventWithEvidence = {
      ...event,
      sourceExcerpt: evidence.excerpt || null,
      sourceEvidence: evidence,
    };

    if (evidence.fields.time === 'missing') {
      const noon = dateOnlySortInstant(event.startTime);
      next = {
        ...next,
        timeKnown: false,
        startTime: Number.isNaN(noon.getTime()) ? event.startTime : noon.toISOString(),
        endTime: null,
        sourceEvidence: {
          ...evidence,
          fields: { ...evidence.fields, time: 'missing' },
        },
      };
    }

    const day = toAppDateKey(new Date(next.startTime));
    const key = `${day}|${fold(next.title)}|${next.timeKnown === false ? 'day' : next.startTime}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(next);
  }

  return out;
}
