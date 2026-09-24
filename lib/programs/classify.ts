import type { EventCardData } from '@/lib/data/events';
import { looksLikeGroupClassListing } from '@/lib/feed/group-class';
import {
  isMixedScrapePageKind,
  scrapePageHasKind,
} from '@/lib/scrape/scrape-page-kind';
import { foldDiacritics } from '@/lib/text/fold-diacritics';

export type ProgramBucket = 'workshops' | 'camps' | 'courses';

export type ProgramsFeedTab = ProgramBucket;

export interface ProgramClassifySignals {
  title: string;
  description?: string | null;
  sourceUrl?: string | null;
  ticketUrl?: string | null;
  /** Venue name is never used for akademia/škola matching (too many weekly academies). */
  venueName?: string | null;
  externalId?: string | null;
  isGroupClass?: boolean | null;
  /** Persisted on events.theme_config.programKind after scrape upsert. */
  themeProgramKind?: string | null;
  scrapePageKind?: string | null;
  isCamp?: boolean | null;
  isWorkshop?: boolean | null;
  isCourse?: boolean | null;
}

const CAMP_TITLE_RE =
  /\b(tabor|tabory|detsky\s+tabor|letny\s+tabor|zimny\s+tabor|sportove\s+prazdnin|kids?\s*camp|summer\s*camp|day\s*camp|kempy?|kempov)\b/i;

const WORKSHOP_TITLE_RE =
  /\b(workshop|workshopy|work\s*shop|masterclass|seminar)\b/i;

const COURSE_TITLE_RE =
  /\b(kurz|kurzy|clinic|course|courses|skolenie)\b/i;

/** Seasonal kids clubs (RŠK krúžky) — Programs → Krúžky, not Events → Skupinové. */
const KIDS_CLUB_TITLE_RE = /\b(kruzok|kruzky)\b/i;

/**
 * One-day / social / special venue events — stay in Events feed, never Programs → Krúžky
 * even when scraped from a mixed page that also lists kids_clubs.
 */
const ONE_OFF_SPECIAL_EVENT_RE =
  /\b(podujatie|party|parties|singles?|nezadan|vecer\s+pre|sportovy\s+vecer|open\s*day|otvorene\s+dvere|festival|koncert|galaviec|galavečer|networking|speed\s*dating)\b/i;

export function looksLikeOneOffSpecialEvent(
  title: string | null | undefined,
  description?: string | null,
): boolean {
  return ONE_OFF_SPECIAL_EVENT_RE.test(haystack([title, description]));
}

function haystack(parts: Array<string | null | undefined>): string {
  return foldDiacritics(parts.filter(Boolean).join(' '));
}

function pathHaystack(url?: string | null): string {
  if (!url) return '';
  try {
    return foldDiacritics(new URL(url).pathname);
  } catch {
    return foldDiacritics(url);
  }
}

function isClassExternalId(externalId?: string | null): boolean {
  const id = (externalId ?? '').toLowerCase();
  return id.startsWith('class-') || id.startsWith('ff-class-');
}

function looksLikeWeeklyLesson(signals: ProgramClassifySignals): boolean {
  if (isClassExternalId(signals.externalId) && !CAMP_TITLE_RE.test(haystack([signals.title]))) {
    if (!WORKSHOP_TITLE_RE.test(haystack([signals.title]))) return true;
  }
  return looksLikeGroupClassListing({
    title: signals.title,
    description: signals.description,
    sourceUrl: signals.sourceUrl,
    ticketUrl: signals.ticketUrl,
    externalId: signals.externalId,
    isGroupClass: signals.isGroupClass,
  });
}

function normalizeStoredKind(raw: string | null | undefined): ProgramBucket | null {
  const v = (raw ?? '').toLowerCase().trim();
  if (v === 'camps' || v === 'camp' || v === 'tabor') return 'camps';
  if (v === 'workshops' || v === 'workshop') return 'workshops';
  if (v === 'courses' || v === 'course' || v === 'kurz') return 'courses';
  return null;
}

/**
 * Scrape-page kind → persist hint for dedicated pages.
 * Mixed multi-role URLs (schedule+events, kids_clubs+kids_camps, …) stay null —
 * per-item flags / title heuristics decide camps vs courses vs events.
 */
export function programKindFromScrapePage(
  kind: string | null | undefined,
): ProgramBucket | null {
  if (!kind) return null;
  if (isMixedScrapePageKind(kind)) return null;
  if (scrapePageHasKind(kind, 'kids_camps')) return 'camps';
  if (scrapePageHasKind(kind, 'workshops')) return 'workshops';
  if (scrapePageHasKind(kind, 'kids_clubs')) return 'courses';
  return null;
}

export function classifyProgramSignals(
  signals: ProgramClassifySignals,
): ProgramBucket | null {
  const titleHay = haystack([signals.title]);
  const bodyHay = haystack([signals.title, signals.description]);
  const urlHay = pathHaystack(signals.sourceUrl ?? signals.ticketUrl);

  // One-day parties / podujatia stay in Events — never Programs, even if
  // theme_config.programKind or isCourse was wrongly set on a mixed kids page.
  if (looksLikeOneOffSpecialEvent(signals.title, signals.description)) {
    return null;
  }

  const stored = normalizeStoredKind(signals.themeProgramKind);
  if (stored) return stored;

  const fromPage = programKindFromScrapePage(signals.scrapePageKind);

  if (signals.isCamp === true || fromPage === 'camps' || CAMP_TITLE_RE.test(titleHay)) {
    return 'camps';
  }
  if (CAMP_TITLE_RE.test(bodyHay) || /\/(letny-tabor|tabory?|summer[-_]?camp|camps?)\b/i.test(urlHay)) {
    if (!looksLikeWeeklyLesson(signals) || CAMP_TITLE_RE.test(titleHay)) return 'camps';
  }

  if (signals.isWorkshop === true || fromPage === 'workshops' || WORKSHOP_TITLE_RE.test(titleHay)) {
    return 'workshops';
  }
  if (WORKSHOP_TITLE_RE.test(bodyHay) || /\/workshopy?\b/i.test(urlHay)) {
    if (!looksLikeWeeklyLesson(signals)) return 'workshops';
  }

  // Seasonal kids clubs / structured courses → Programs → Krúžky.
  // Do this BEFORE weekly-lesson short-circuit so "Curling krúžok" is not a gym slot.
  if (KIDS_CLUB_TITLE_RE.test(titleHay)) {
    return 'courses';
  }
  if (signals.isCourse === true && (COURSE_TITLE_RE.test(titleHay) || KIDS_CLUB_TITLE_RE.test(titleHay))) {
    return 'courses';
  }
  // kids_clubs page role: only when title/url actually looks like a club/course —
  // never blanket every news/event card on a mixed venue page.
  if (
    scrapePageHasKind(signals.scrapePageKind, 'kids_clubs') &&
    (COURSE_TITLE_RE.test(titleHay) ||
      KIDS_CLUB_TITLE_RE.test(titleHay) ||
      /\/(kruzky|kurzy)\b/i.test(urlHay) ||
      (fromPage === 'courses' && !looksLikeWeeklyLesson(signals)))
  ) {
    return 'courses';
  }

  // Weekly studio slots (class-* rozvrh) stay out of Programs.
  if (looksLikeWeeklyLesson(signals)) return null;

  if (COURSE_TITLE_RE.test(titleHay)) {
    return 'courses';
  }
  if (/\/(kurzy|courses?|kruzky)\b/i.test(urlHay) && COURSE_TITLE_RE.test(titleHay)) {
    return 'courses';
  }

  return null;
}

function themeProgramKind(event: EventCardData): string | null {
  const cfg = event.themeConfig;
  if (!cfg || typeof cfg !== 'object') return null;
  const value = (cfg as Record<string, unknown>).programKind;
  return typeof value === 'string' ? value : null;
}

/** Classify camps vs workshops vs structured courses. Weekly group lessons never match. */
export function classifyProgram(event: EventCardData): ProgramBucket | null {
  return classifyProgramSignals({
    title: event.title,
    description: event.description,
    sourceUrl: event.sourceUrl,
    ticketUrl: event.ticketUrl,
    venueName: event.venueName,
    externalId: event.externalId,
    themeProgramKind: themeProgramKind(event),
  });
}

export function isProgramEvent(event: EventCardData): boolean {
  return classifyProgram(event) != null;
}

export function allProgramEvents(events: EventCardData[]): EventCardData[] {
  const out: EventCardData[] = [];
  const seen = new Set<string>();
  for (const event of events) {
    if (seen.has(event.id)) continue;
    if (!classifyProgram(event)) continue;
    seen.add(event.id);
    out.push(event);
  }
  return out.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export function filterProgramEvents(
  events: EventCardData[],
  tab: ProgramsFeedTab,
): EventCardData[] {
  return allProgramEvents(events).filter((event) => classifyProgram(event) === tab);
}

export function parseProgramsFeedTab(raw: string | undefined | null): ProgramsFeedTab {
  if (raw === 'camps' || raw === 'courses' || raw === 'workshops') return raw;
  if (raw === 'all') return 'workshops';
  return 'workshops';
}
