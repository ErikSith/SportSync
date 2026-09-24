/**
 * SportSync hub taxonomy — four destinations for scraped listings.
 *
 * | Bucket        | Hub tile              | Route                  | Storage                                      |
 * |---------------|-----------------------|------------------------|----------------------------------------------|
 * | event         | Eventy                | /events                | events (not class-*, no programKind)         |
 * | tournament    | Turnaje               | /tournaments           | tournaments table                            |
 * | group_class   | Skupinové cvičenia    | /skupinove-cvicenia    | events with class-* + group-class write      |
 * | program       | Tábory & krúžky       | /programs              | events + theme_config.programKind            |
 * | skip          | —                     | —                      | news / nav chrome / weak leftovers           |
 *
 * Eventy = unusual one-day happenings (marathon, Red Bull night, festival).
 * Turnaje = open-entry cups / championships (not A vs B spectator fixtures).
 * Skupinové = repeating studio/venue schedule slots.
 * Programy = camps, workshops, seasonal kids clubs/courses.
 */
import {
  looksLikeNavOrSectionTitle,
  looksLikeGroupClassListing,
  looksLikeOneOffSpecialEvent,
  normalizeLessonTitle,
  shouldForceGroupClassFromUrl,
} from '@/lib/feed/group-class';
import { looksLikeNewsOrResultTitle } from '@/lib/scrape/news-result';
import {
  classifyProgramSignals,
  type ProgramBucket,
} from '@/lib/programs/classify';
import { titleLooksLikeHeadToHeadFixture } from '@/lib/participation/fixture-match';
import type { ScrapedEvent } from '@/src/lib/scraper/types';

export type ListingHubBucket =
  | 'event'
  | 'tournament'
  | 'group_class'
  | 'program'
  | 'skip';

export type ListingBucketResult = {
  bucket: ListingHubBucket;
  programKind: ProgramBucket | null;
  reason: string;
};

export type ClassifyListingInput = {
  title: string;
  description?: string | null;
  sourceUrl?: string | null;
  ticketUrl?: string | null;
  isTournament?: boolean | null;
  isGroupClass?: boolean | null;
  isCamp?: boolean | null;
  isWorkshop?: boolean | null;
  isCourse?: boolean | null;
  scrapePageKind?: string | null;
  forceProgramKind?: ProgramBucket | null;
  forceGroupClass?: boolean;
  recurringTitles?: ReadonlySet<string>;
};

/** Spectacle / race keywords that keep a "cup" title in Eventy, not Turnaje. */
const EVENT_OVER_TOURNAMENT_RE =
  /\b(marat[oó]?n|marathon|festival|party|red\s*bull|koncert|galave[cč]er|night\s*run|beh\b)\b/i;

function looksLikeOpenEntryTournament(title: string, description: string | null, flagged: boolean): boolean {
  if (EVENT_OVER_TOURNAMENT_RE.test(title)) return false;
  if (flagged) return true;
  const hay = `${title} ${description ?? ''}`;
  if (
    /\b(turnaj|tournament|championship|trophy|kvalifik[aá]c|s[uú]ťaž|sutaz)\b/i.test(
      hay,
    )
  ) {
    return true;
  }
  // "Cup" alone — only when not a social/festival spectacle.
  if (/\bcup\b/i.test(title) && !EVENT_OVER_TOURNAMENT_RE.test(hay)) return true;
  return false;
}

/**
 * Decide where a scraped listing belongs before upsert.
 * Order: skip → program → tournament → group_class → event → skip.
 */
export function classifyListingHubBucket(
  input: ClassifyListingInput,
): ListingBucketResult {
  const title = (input.title ?? '').trim();
  const description = input.description ?? null;
  const pageUrl = input.sourceUrl ?? input.ticketUrl ?? null;

  if (!title || looksLikeNavOrSectionTitle(title)) {
    return { bucket: 'skip', programKind: null, reason: 'nav_or_empty' };
  }
  if (looksLikeNewsOrResultTitle(title, description)) {
    return { bucket: 'skip', programKind: null, reason: 'news_or_result' };
  }

  // A vs B league fixtures → Eventy (Sledovať), never Turnaje.
  if (titleLooksLikeHeadToHeadFixture(title)) {
    return { bucket: 'event', programKind: null, reason: 'fixture_watch' };
  }

  const programKind = classifyProgramSignals({
    title,
    description,
    sourceUrl: pageUrl,
    ticketUrl: input.ticketUrl,
    isGroupClass: input.isGroupClass,
    isCamp: input.isCamp,
    isWorkshop: input.isWorkshop,
    isCourse: input.isCourse,
    scrapePageKind: input.scrapePageKind,
    themeProgramKind: input.forceProgramKind,
  });
  if (programKind) {
    return { bucket: 'program', programKind, reason: `program:${programKind}` };
  }

  if (
    looksLikeOpenEntryTournament(title, description, input.isTournament === true) &&
    !looksLikeGroupClassListing({
      title,
      description,
      sourceUrl: pageUrl,
      isGroupClass: input.isGroupClass,
    })
  ) {
    return { bucket: 'tournament', programKind: null, reason: 'tournament' };
  }

  const recurring =
    input.recurringTitles?.has(normalizeLessonTitle(title)) === true;
  const asGroup =
    input.forceGroupClass === true ||
    input.isGroupClass === true ||
    recurring ||
    shouldForceGroupClassFromUrl(pageUrl) ||
    looksLikeGroupClassListing({
      title,
      description,
      sourceUrl: pageUrl,
      isGroupClass: input.isGroupClass,
    });

  if (asGroup && !looksLikeOneOffSpecialEvent(title, description)) {
    return { bucket: 'group_class', programKind: null, reason: 'group_class' };
  }

  if (looksLikeOneOffSpecialEvent(title, description)) {
    return { bucket: 'event', programKind: null, reason: 'one_off_special' };
  }

  if (input.forceGroupClass || shouldForceGroupClassFromUrl(pageUrl)) {
    return { bucket: 'group_class', programKind: null, reason: 'schedule_page_default' };
  }

  // Weak PODUJATIE without special signals — do not invent Eventy cards.
  return { bucket: 'skip', programKind: null, reason: 'no_hub_signal' };
}

export function classifyScrapedEventBucket(
  event: ScrapedEvent,
  opts: {
    scrapePageUrl?: string | null;
    scrapePageKind?: string | null;
    forceProgramKind?: ProgramBucket | null;
    forceGroupClass?: boolean;
    recurringTitles?: ReadonlySet<string>;
  } = {},
): ListingBucketResult {
  return classifyListingHubBucket({
    title: event.title,
    description: event.description,
    sourceUrl: opts.scrapePageUrl ?? event.originalUrl,
    ticketUrl: event.detailUrl ?? event.originalUrl,
    isTournament: event.isTournament,
    isGroupClass: event.isGroupClass,
    isCamp: event.isCamp,
    isWorkshop: event.isWorkshop,
    isCourse: event.isCourse,
    scrapePageKind: opts.scrapePageKind,
    forceProgramKind: opts.forceProgramKind,
    forceGroupClass: opts.forceGroupClass,
    recurringTitles: opts.recurringTitles,
  });
}
