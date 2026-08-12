import type { EventType } from '@/lib/constants/events';
import {
  applyPlayerFeedFilters,
  matchesTypeFilter,
  type HomeFeedFilters,
} from '@/lib/home-feed-filters';

export type DiscoveryReason = 'new' | 'filling_fast' | 'popular';

export interface DiscoveryFeedMeta {
  isDiscovery: boolean;
  discoveryReason?: DiscoveryReason;
}

export type MixedFeedItem<T> = T & DiscoveryFeedMeta;

export interface MixableEvent {
  id: string;
  startsAt: Date;
  capacity: number | null;
  maxParticipants: number | null;
  registeredCount: number;
  type: EventType;
  sport: string;
  venueId: string | null;
}

const DEFAULT_MATCH_RATIO = 0.7;
/** Treat events starting within this window as "new / try something" when ranking discovery. */
const NEW_EVENT_DAYS = 3;
const FILLING_FAST_SPOTS_MAX = 2;
const POPULAR_FILL_RATIO = 0.65;

function capacityOf(event: MixableEvent): number | null {
  const cap = event.maxParticipants ?? event.capacity;
  if (cap === null || cap <= 0) return null;
  return cap;
}

function spotsLeft(event: MixableEvent): number | null {
  const cap = capacityOf(event);
  if (cap === null) return null;
  return Math.max(0, cap - event.registeredCount);
}

function fillRatio(event: MixableEvent): number {
  const cap = capacityOf(event);
  if (cap === null) return 0;
  return event.registeredCount / cap;
}

function isStartingSoon(event: MixableEvent, now: Date): boolean {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + NEW_EVENT_DAYS);
  return event.startsAt >= now && event.startsAt <= cutoff;
}

/** Rank discovery candidates: filling fast > popular > new/soon > rest. */
export function scoreDiscoveryCandidate(event: MixableEvent, now = new Date()): {
  score: number;
  reason: DiscoveryReason;
} {
  const left = spotsLeft(event);
  const ratio = fillRatio(event);

  if (left !== null && left >= 1 && left <= FILLING_FAST_SPOTS_MAX) {
    return { score: 300 + (FILLING_FAST_SPOTS_MAX - left) * 10 + ratio * 5, reason: 'filling_fast' };
  }
  if (ratio >= POPULAR_FILL_RATIO) {
    return { score: 200 + ratio * 40, reason: 'popular' };
  }
  if (isStartingSoon(event, now) || event.type === 'official') {
    const hoursUntil = Math.max(0, (event.startsAt.getTime() - now.getTime()) / (1000 * 60 * 60));
    return { score: 100 + Math.max(0, 72 - hoursUntil), reason: 'new' };
  }
  return { score: ratio * 20, reason: 'new' };
}

/**
 * Build a ~70% strict-match / ~30% discovery feed.
 * Discovery ignores sport + venue but respects area (caller must pass area-scoped events)
 * and event type. When discovery is off or no sport/venue prefs, returns 100% match.
 */
export function mixMatchDiscoveryFeed<T extends MixableEvent>(
  areaEvents: T[],
  filters: HomeFeedFilters,
  options?: { matchRatio?: number; now?: Date },
): MixedFeedItem<T>[] {
  const matchRatio = options?.matchRatio ?? DEFAULT_MATCH_RATIO;
  const now = options?.now ?? new Date();

  const typeScoped = areaEvents.filter((event) => matchesTypeFilter(event.type, filters));

  // Silent discovery: always on when the user narrowed sports/venues.
  // No UI toggle — feed just feels alive without advertising the mix.
  const hasSoftPrefs = filters.sports.length > 0 || filters.venueIds.length > 0;
  if (!hasSoftPrefs) {
    const matched = applyPlayerFeedFilters(typeScoped, filters, {
      sport: (e) => e.sport,
      venueId: (e) => e.venueId,
      type: (e) => e.type,
    });
    return matched.map((event) => ({ ...event, isDiscovery: false }));
  }

  const matchPool = applyPlayerFeedFilters(typeScoped, filters, {
    sport: (e) => e.sport,
    venueId: (e) => e.venueId,
    type: (e) => e.type,
  });
  const matchIds = new Set(matchPool.map((e) => e.id));

  // Discovery: same area + type, explicitly outside sport/venue prefs.
  const discoveryRanked = typeScoped
    .filter((event) => !matchIds.has(event.id))
    .map((event) => {
      const { score, reason } = scoreDiscoveryCandidate(event, now);
      return { event, score, reason };
    })
    .sort((a, b) => b.score - a.score || a.event.startsAt.getTime() - b.event.startsAt.getTime());

  if (discoveryRanked.length === 0) {
    return matchPool.map((event) => ({ ...event, isDiscovery: false }));
  }
  if (matchPool.length === 0) {
    // Nothing matches prefs — surface discovery so the feed isn't empty.
    return discoveryRanked.map(({ event, reason }) => ({
      ...event,
      isDiscovery: true,
      discoveryReason: reason,
    }));
  }

  const mixed: MixedFeedItem<T>[] = [];
  let m = 0;
  let d = 0;

  while (m < matchPool.length || d < discoveryRanked.length) {
    const total = mixed.length;
    const discoveryShare = total === 0 ? 0 : d / total;
    const preferDiscovery =
      d < discoveryRanked.length &&
      (m >= matchPool.length ||
        (discoveryShare < 1 - matchRatio && (total + 1) % 4 === 0));

    if (preferDiscovery) {
      const { event, reason } = discoveryRanked[d++]!;
      mixed.push({ ...event, isDiscovery: true, discoveryReason: reason });
    } else if (m < matchPool.length) {
      mixed.push({ ...matchPool[m++]!, isDiscovery: false });
    } else {
      const { event, reason } = discoveryRanked[d++]!;
      mixed.push({ ...event, isDiscovery: true, discoveryReason: reason });
    }
  }

  return mixed;
}
