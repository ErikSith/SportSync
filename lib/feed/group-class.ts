/**
 * Distinguishes one-off events/tournaments from repeating venue group lessons.
 * Used by the Events feed split, Gemini upsert, and reclassify scripts.
 */

const SPECIAL_EVENT_TITLE =
  /\b(piatkovica|open\s*air|hyrox|workshop|masterclass|marathon|turnaj|tournament|cup|championship|liga|match|zápas|exhibition|exhib[íi]cia|koncert|festival)\b/i;

/** Typical repeating studio / academy / group-class names (not one-off events). */
const GROUP_CLASS_TITLE =
  /\b(pilates|piloxing|hiit|yoga|joga|tabata|spinning|cycling|crossfit|body\s*pump|body\s*combat|power\s*plate|bungee|jumping|kruhov[ýa]|funkčn|functional|kickbox|k1|muay\s*thai|box|boxing|mma|bjj|grappling|tréning|trening|lekcia|lesson|class|fitcamp|visionbody|footwork|strečing|strecing|stretching|cvičen[iaeíeéyý]*|n[áa]bor|akademi[aeiy]*|barre|trx|deepwork|gymstick|instagym|korču[ľl]\w*)\b/i;

const GROUP_CLASS_DESCRIPTION =
  /skupinov[ée]\s+cvičen|skupinov[ýáé]\s+tr[eé]ning|group\s+class|rozvrh\s+lekci|týždenn[ýy]\s+rozvrh|kazd[ýy]\s+(pondelok|utorok|streda|štvrtok|stvrtok|piatok)|každ[ýy]\s+(pondelok|utorok|streda|štvrtok|piatok)|online\s+tr[eé]ningov[ýy]\s+program/i;

/** Schedule, academy, or recurring-program pages — not unique event listings. */
const SCHEDULE_OR_PROGRAM_URL =
  /\/(rozvrh|schedule|calendar|kalendar|treningy?|tréningy?|lekcie?|classes?|skupinov|programy|akademi[ae]|treningovy-program|tréningový-program|online-treningovy)(\/|$|\?)/i;

const COURT_RENTAL_URL =
  /prenajom[-_]?(tenisovych[-_]?kurtov|kurtov)|court[-_]?rental|prenájom[-_ ]tenis/i;

const COURT_RENTAL_TITLE =
  /^(cenník|prenájom(\s+tenisových)?\s+kurt|prenajom(\s+tenisovych)?\s+kurt|otváracie\s+hodiny|opening\s+hours)\b/i;

export interface GroupClassSignals {
  title: string;
  description?: string | null;
  sourceUrl?: string | null;
  ticketUrl?: string | null;
  externalId?: string | null;
  /** Gemini structured field — repeating group lesson at a venue. */
  isGroupClass?: boolean | null;
}

export interface RecurringListing {
  id: string;
  title: string;
  startsAt: Date | string;
  venueId?: string | null;
  venueName?: string | null;
  city?: string | null;
  source?: string | null;
}

export function looksLikeSpecialEventTitle(title: string): boolean {
  return SPECIAL_EVENT_TITLE.test(title);
}

export function normalizeLessonTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(rok narodenia|nar\.)\s*\d{4}\b/g, ' ')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function shouldForceGroupClassFromUrl(url: string | null | undefined): boolean {
  const value = (url ?? '').toLowerCase();
  if (!value) return false;
  if (COURT_RENTAL_URL.test(value)) return false;
  return SCHEDULE_OR_PROGRAM_URL.test(value);
}

export function looksLikeGroupClassListing(signals: GroupClassSignals): boolean {
  if (signals.isGroupClass === true && !looksLikeSpecialEventTitle(signals.title)) {
    return true;
  }

  const externalId = (signals.externalId ?? '').toLowerCase();
  if (externalId.startsWith('class-')) return true;

  if (looksLikeSpecialEventTitle(signals.title)) return false;

  const sourceUrl = (signals.sourceUrl ?? signals.ticketUrl ?? '').toLowerCase();
  if (shouldForceGroupClassFromUrl(sourceUrl)) return true;

  if (GROUP_CLASS_DESCRIPTION.test(signals.description ?? '')) return true;
  if (GROUP_CLASS_TITLE.test(signals.title)) return true;

  return false;
}

/** Court-hire price lists and opening hours — not events and not group lessons. */
export function isListingNoise(
  signals: Pick<GroupClassSignals, 'title' | 'description' | 'sourceUrl' | 'ticketUrl'>,
): boolean {
  const title = signals.title.trim();
  if (COURT_RENTAL_TITLE.test(title)) return true;

  const url = `${signals.sourceUrl ?? ''} ${signals.ticketUrl ?? ''}`.toLowerCase();
  if (COURT_RENTAL_URL.test(url)) {
    const looksLikeActivity =
      GROUP_CLASS_TITLE.test(title) ||
      looksLikeSpecialEventTitle(title) ||
      /\b(turnaj|nábor|nabor|tréning|trening|lekcia)\b/i.test(title);
    return !looksLikeActivity;
  }

  return false;
}

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function venueSeriesPart(listing: RecurringListing): string {
  return (
    listing.venueId ??
    `${(listing.source ?? 'unknown').toLowerCase()}::${(listing.venueName ?? listing.city ?? 'unknown').toLowerCase()}`
  );
}

export function lessonSeriesKey(listing: RecurringListing): string {
  return `${venueSeriesPart(listing)}::${normalizeLessonTitle(listing.title)}`;
}

/**
 * Same activity at the same venue on 2+ calendar days → repeating group lesson,
 * even when there is only one slot per day (L4T footwork, kids academy, …).
 */
export function recurringSeriesLessonIds(
  listings: RecurringListing[],
  dayKey: (startsAt: Date | string) => string,
): Set<string> {
  const buckets = new Map<string, RecurringListing[]>();

  for (const listing of listings) {
    if (looksLikeSpecialEventTitle(listing.title)) continue;
    const key = lessonSeriesKey(listing);
    const title = normalizeLessonTitle(listing.title);
    if (title.length < 3) continue;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(listing);
    else buckets.set(key, [listing]);
  }

  const ids = new Set<string>();
  for (const bucket of buckets.values()) {
    const days = new Set(bucket.map((item) => dayKey(item.startsAt)));
    if (days.size < 2) continue;
    for (const item of bucket) ids.add(item.id);
  }
  return ids;
}

/** Normalized titles that repeat on 2+ days inside one scrape batch. */
export function recurringNormalizedTitlesFromBatch(
  events: Array<{ title: string; startTime: string }>,
  dayKey: (startsAt: Date | string) => string,
): Set<string> {
  const buckets = new Map<string, Set<string>>();
  for (const event of events) {
    if (looksLikeSpecialEventTitle(event.title)) continue;
    const title = normalizeLessonTitle(event.title);
    if (title.length < 3) continue;
    const days = buckets.get(title) ?? new Set<string>();
    days.add(dayKey(event.startTime));
    buckets.set(title, days);
  }
  const out = new Set<string>();
  for (const [title, days] of buckets) {
    if (days.size >= 2) out.add(title);
  }
  return out;
}
