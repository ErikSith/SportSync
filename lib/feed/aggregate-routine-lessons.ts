import type { EventCardData } from '@/lib/data/events';
import {
  addAppCalendarDays,
  formatAppDate,
  formatAppTime,
  toAppDateKey,
} from '@/lib/datetime/bratislava';
import {
  looksLikeGroupClassListing,
  looksLikeSpecialEventTitle,
  recurringSeriesLessonIds,
} from '@/lib/feed/group-class';
import { displayVenueName } from '@/lib/venues/listing-url';
import { dedupeLessonsAtSameVenueSlot } from '@/lib/events/event-identity';

/** Feed item kinds after routine-lesson aggregation. */
export type FeedEventKind = 'INDEPENDENT_EVENT' | 'ROUTINE_LESSON_GROUP';

/** Studio / group-class scrape sources that emit dense daily schedules. */
const ROUTINE_CLASS_SOURCES = new Set([
  'form-factory',
  'prostor',
  'ofa-mma',
  'chaos-mma',
  'gemini-web',
]);

/** Minimum same-venue same-day aggregated slots to treat the whole bucket as lessons. */
const DENSE_VENUE_DAY_MIN = 3;

/** Minimum lessons per venue+day before collapsing into one schedule card. */
const MIN_GROUP_SIZE = 1;

/**
 * Split Feed (Eventy | Skupinové lekcie): collapse every routine lesson into a
 * venue-day group so repeating studio/academy classes never leak into Eventy.
 */
const SPLIT_FEED_MIN_GROUP_SIZE = 1;

/** How many upcoming slots to preview on the compact card. */
export const ROUTINE_PREVIEW_SLOT_COUNT = 4;

/**
 * Single class / lesson slot inside a venue-day schedule accordion.
 * Same shape as a feed card; always a recurring studio session.
 */
export type ClassSession = EventCardData;

/**
 * High-intent single match / tournament / community game.
 * Never a recurring Form Factory–style group class.
 */
export type CommunityEvent = EventCardData;

export interface GroupedVenueSchedule {
  kind: 'ROUTINE_LESSON_GROUP';
  /** Stable key: venue/source + local day. */
  id: string;
  venueId: string | null;
  venueName: string;
  city: string;
  source: string | null;
  sourceName: string | null;
  dayKey: string;
  dayLabel: string;
  /** Day's ClassSessions, chronological. */
  lessons: ClassSession[];
  distanceKm: number;
  coverUrl: string | null;
  sport: string;
}

/**
 * Venue-day accordion payload for the Skupinové lekcie tab.
 * Alias of {@link GroupedVenueSchedule} — `lessons` is the ClassSession list.
 */
export type VenueScheduleGroup = GroupedVenueSchedule;

export interface IndependentFeedEvent {
  kind: 'INDEPENDENT_EVENT';
  /** Community / unique high-intent event (see {@link CommunityEvent}). */
  event: CommunityEvent;
}

export type AggregatedFeedItem = IndependentFeedEvent | GroupedVenueSchedule;

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Bratislava calendar day key (YYYY-MM-DD) for grouping — device TZ independent. */
export function eventDayKey(startsAt: Date | string): string {
  return toAppDateKey(asDate(startsAt));
}

function dayLabelFor(startsAt: Date): string {
  const todayKey = toAppDateKey(new Date());
  const key = toAppDateKey(startsAt);
  if (key === todayKey) return 'Dnešný';
  if (key === addAppCalendarDays(todayKey, 1)) return 'Zajtrajší';
  const weekday = formatAppDate(startsAt, { weekday: 'long' }, 'sk-SK');
  const datePart = formatAppDate(startsAt, { day: 'numeric', month: 'numeric' }, 'sk-SK');
  const capped = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capped} ${datePart}`;
}

export function slovakLessonCountLabel(count: number): string {
  if (count === 1) return '1 cvičenie';
  if (count >= 2 && count <= 4) return `${count} cvičenia`;
  return `${count} cvičení`;
}

/** Compact rollup copy: "6 lekcií". */
export function slovakLekcieCountLabel(count: number): string {
  if (count === 1) return '1 lekcia';
  if (count >= 2 && count <= 4) return `${count} lekcie`;
  return `${count} lekcií`;
}

/** Short day token for collapsed schedule bars: Dnes / Zajtra / weekday. */
export function shortScheduleDayLabel(dayLabel: string): string {
  if (dayLabel === 'Dnešný') return 'Dnes';
  if (dayLabel === 'Zajtrajší') return 'Zajtra';
  return dayLabel;
}

function passesRoutineGates(event: EventCardData): boolean {
  return (
    event.participationMode === 'participate' &&
    event.type !== 'community' &&
    event.isAggregated
  );
}

/**
 * Classify a feed event as a repeating venue group lesson vs a standalone event
 * (tournament, lobby match, marketing one-off, in-app registration).
 *
 * Heuristics (any one is enough, after base gates):
 * - same title at the same venue on 2+ days (`recurringSeriesIds`)
 * - dense same-venue same-day timetable (`denseVenueDayIds`)
 * - `class-` external id / Gemini `isGroupClass` / program+rozvrh URL / class-like title
 * - known dense class sources (Form Factory, gemini-web, …) + fitness/combat sports
 */
export function isRoutineLesson(
  event: EventCardData,
  denseVenueDayIds?: ReadonlySet<string>,
  recurringSeriesIds?: ReadonlySet<string>,
): boolean {
  if (!passesRoutineGates(event)) return false;
  if (looksLikeSpecialEventTitle(event.title)) return false;

  if (recurringSeriesIds?.has(event.id)) return true;
  if (denseVenueDayIds?.has(event.id)) return true;

  const externalId = (event.externalId ?? '').toLowerCase();
  if (externalId.startsWith('event-')) return false;

  if (
    looksLikeGroupClassListing({
      title: event.title,
      description: event.description,
      sourceUrl: event.sourceUrl,
      ticketUrl: event.ticketUrl,
      externalId: event.externalId,
    })
  ) {
    return true;
  }

  const source = (event.source ?? '').toLowerCase();
  if (ROUTINE_CLASS_SOURCES.has(source)) {
    const sport = event.sport.toUpperCase();
    if (
      sport === 'FITNESS' ||
      sport === 'OTHER' ||
      sport === 'MMA' ||
      sport === 'COMBAT' ||
      sport === 'BOXING' ||
      sport === 'YOGA' ||
      sport === 'CLIMBING'
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Venues that publish many short slots on the same day are studios, not event hosts.
 * Returns event ids that should be treated as group lessons.
 */
export function denseVenueDayLessonIds(events: EventCardData[]): Set<string> {
  const buckets = new Map<string, EventCardData[]>();

  for (const event of events) {
    if (event.participationMode !== 'participate') continue;
    if (event.type === 'community') continue;
    if (!event.isAggregated) continue;
    if (looksLikeSpecialEventTitle(event.title)) continue;

    const key = groupKey(event);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(event);
    else buckets.set(key, [event]);
  }

  const ids = new Set<string>();
  for (const bucket of buckets.values()) {
    if (bucket.length < DENSE_VENUE_DAY_MIN) continue;
    for (const event of bucket) ids.add(event.id);
  }
  return ids;
}

function groupKey(event: EventCardData): string {
  const day = eventDayKey(event.startsAt);
  const venuePart =
    event.venueId ??
    `${(event.source ?? 'unknown').toLowerCase()}::${(event.venueName ?? event.city).toLowerCase()}`;
  return `${venuePart}__${day}`;
}

function buildGroupedSchedule(lessons: EventCardData[], key: string): GroupedVenueSchedule {
  const sorted = dedupeLessonsAtSameVenueSlot(lessons).sort(
    (a, b) => asDate(a.startsAt).getTime() - asDate(b.startsAt).getTime(),
  );
  const first = sorted[0]!;
  const namedLesson =
    sorted.find((lesson) => displayVenueName(lesson.venueName, '') !== '') ?? first;
  const venueName = displayVenueName(
    namedLesson.venueName,
    first.city?.trim() || 'Športovisko',
  );

  return {
    kind: 'ROUTINE_LESSON_GROUP',
    id: `schedule-${key}`,
    venueId: namedLesson.venueId ?? first.venueId,
    venueName,
    city: first.city,
    source: first.source,
    sourceName: first.sourceName,
    dayKey: eventDayKey(first.startsAt),
    dayLabel: dayLabelFor(asDate(first.startsAt)),
    lessons: sorted,
    distanceKm: Math.min(...sorted.map((l) => l.distanceKm)),
    coverUrl: sorted.find((l) => l.coverUrl)?.coverUrl ?? null,
    sport: first.sport,
  };
}

/**
 * Sorting timestamp for a feed item: independent event `startsAt`, or the
 * earliest lesson in a grouped venue schedule.
 */
export function feedItemStartsAt(item: AggregatedFeedItem): Date {
  if (item.kind === 'ROUTINE_LESSON_GROUP') {
    return asDate(item.lessons[0]!.startsAt);
  }
  return asDate(item.event.startsAt);
}

/** Ascending chronological order (earliest first). */
export function sortFeedItemsChronologically(
  items: AggregatedFeedItem[],
): AggregatedFeedItem[] {
  return [...items].sort(
    (a, b) => feedItemStartsAt(a).getTime() - feedItemStartsAt(b).getTime(),
  );
}

/**
 * Collapse dense routine venue lessons into one Grouped Venue Schedule per
 * venue+day, while keeping tournaments / unique actions as independent cards.
 * Result is sorted strictly by start time (group uses first lesson's startsAt).
 */
export function aggregateEventsForFeed(
  events: EventCardData[],
  options?: { minGroupSize?: number },
): AggregatedFeedItem[] {
  const minGroupSize = options?.minGroupSize ?? MIN_GROUP_SIZE;
  const denseIds = denseVenueDayLessonIds(events);
  const seriesIds = recurringSeriesLessonIds(
    events.filter(passesRoutineGates),
    eventDayKey,
  );

  const routineBuckets = new Map<string, EventCardData[]>();
  for (const event of events) {
    if (!isRoutineLesson(event, denseIds, seriesIds)) continue;
    const key = groupKey(event);
    const bucket = routineBuckets.get(key);
    if (bucket) bucket.push(event);
    else routineBuckets.set(key, [event]);
  }

  const groupableKeys = new Set<string>();
  for (const [key, bucket] of routineBuckets) {
    if (bucket.length >= minGroupSize) groupableKeys.add(key);
  }

  const emittedGroups = new Set<string>();
  const result: AggregatedFeedItem[] = [];

  for (const event of events) {
    if (!isRoutineLesson(event, denseIds, seriesIds)) {
      result.push({ kind: 'INDEPENDENT_EVENT', event });
      continue;
    }

    const key = groupKey(event);
    if (!groupableKeys.has(key)) {
      // Repeating group lessons never belong in Eventy — emit a 1-slot schedule
      // card when the venue-day bucket is smaller than minGroupSize.
      if (minGroupSize <= 1) {
        if (!emittedGroups.has(key)) {
          emittedGroups.add(key);
          result.push(buildGroupedSchedule(routineBuckets.get(key) ?? [event], key));
        }
        continue;
      }
      result.push({ kind: 'INDEPENDENT_EVENT', event });
      continue;
    }

    if (emittedGroups.has(key)) continue;
    emittedGroups.add(key);
    result.push(buildGroupedSchedule(routineBuckets.get(key)!, key));
  }

  return sortFeedItemsChronologically(result);
}

/** Hybrid Hub partition: unique events vs venue-day schedule groups. */
export interface PartitionedFeed {
  uniqueEvents: IndependentFeedEvent[];
  venueGroupedSchedules: GroupedVenueSchedule[];
  /** Chronological merge — home rail / callers that need time order. */
  chronological: AggregatedFeedItem[];
}

/**
 * Aggregate then split into Hybrid Hub sections. Each bucket is sorted by
 * startsAt; `chronological` preserves the interleaved time order.
 */
export function partitionFeedForHybridHub(
  events: EventCardData[],
  options?: { minGroupSize?: number },
): PartitionedFeed {
  const chronological = aggregateEventsForFeed(events, options);
  const uniqueEvents: IndependentFeedEvent[] = [];
  const venueGroupedSchedules: GroupedVenueSchedule[] = [];

  for (const item of chronological) {
    if (item.kind === 'ROUTINE_LESSON_GROUP') {
      venueGroupedSchedules.push(item);
    } else {
      uniqueEvents.push(item);
    }
  }

  return {
    uniqueEvents: uniqueEvents.sort(
      (a, b) => feedItemStartsAt(a).getTime() - feedItemStartsAt(b).getTime(),
    ),
    venueGroupedSchedules: venueGroupedSchedules.sort(
      (a, b) => feedItemStartsAt(a).getTime() - feedItemStartsAt(b).getTime(),
    ),
    chronological,
  };
}

/**
 * Split Feed partition for Events tabs:
 * - `uniqueEvents` → Eventy & Zápasy (one-off CommunityEvent only)
 * - `venueGroupedSchedules` → Skupinové lekcie (VenueScheduleGroup accordions)
 */
export function partitionFeedForSplitTabs(events: EventCardData[]): PartitionedFeed {
  const denseIds = denseVenueDayLessonIds(events);
  const seriesIds = recurringSeriesLessonIds(
    events.filter(passesRoutineGates),
    eventDayKey,
  );
  const partitioned = partitionFeedForHybridHub(events, {
    minGroupSize: SPLIT_FEED_MIN_GROUP_SIZE,
  });

  // Safety net: never surface a routine lesson as a match card.
  const uniqueEvents = partitioned.uniqueEvents.filter(
    (item) => !isRoutineLesson(item.event, denseIds, seriesIds),
  );

  return {
    ...partitioned,
    uniqueEvents,
  };
}

/** Slovak date overview for Skupinové lekcie header, e.g. "štvrtok 6. 8.". */
export function slovakScheduleDateOverview(date: Date = new Date()): string {
  const weekday = formatAppDate(date, { weekday: 'long' }, 'sk-SK');
  const dayMonth = formatAppDate(date, { day: 'numeric', month: 'numeric' }, 'sk-SK');
  return `${weekday} ${dayMonth}`;
}

/** Condensed pill copy: "Štvrtok 6. 8. • 12 lekcií dnes". */
export function scheduleOverviewPillLabel(
  groups: VenueScheduleGroup[],
  now: Date = new Date(),
): string {
  const todayKey = eventDayKey(now);
  const todayCount = groups
    .filter((g) => g.dayKey === todayKey)
    .reduce((sum, g) => sum + g.lessons.length, 0);
  const total = groups.reduce((sum, g) => sum + g.lessons.length, 0);
  const datePart = slovakScheduleDateOverview(now);
  const capped = datePart.charAt(0).toUpperCase() + datePart.slice(1);

  if (todayCount > 0) {
    return `${capped} • ${slovakLekcieCountLabel(todayCount)} dnes`;
  }
  if (total > 0) {
    return `${capped} • ${slovakLekcieCountLabel(total)}`;
  }
  return `${capped} • 0 lekcií dnes`;
}

/** Initials for venue avatar when no logo URL is available (e.g. "Form Factory" → "FF"). */
export function venueScheduleInitials(venueName: string): string {
  const parts = venueName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return venueName.trim().slice(0, 2).toUpperCase() || '•';
}

export function formatLessonTime(startsAt: Date | string): string {
  return formatAppTime(asDate(startsAt));
}

export function groupedScheduleTitle(group: GroupedVenueSchedule): string {
  const count = slovakLessonCountLabel(group.lessons.length);
  if (group.dayLabel === 'Dnešný' || group.dayLabel === 'Zajtrajší') {
    return `${group.venueName} — ${group.dayLabel} rozpis lekcií (${count})`;
  }
  return `${group.venueName} — Rozpis lekcií · ${group.dayLabel} (${count})`;
}
