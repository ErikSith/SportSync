import type { EventType } from '@/lib/constants/events';
import { EVENT_SPORTS, isEventSport, sportDisplayLabel } from '@/lib/constants/sports';
import { feedAreaLabel, parseFeedArea, type FeedAreaId } from '@/lib/cities';

export const HOME_FEED_STORAGE_KEY = 'sportsync-home-feed-filters';

export interface HomeFeedFilters {
  sports: string[];
  venueIds: string[];
  type: EventType | 'ALL';
  /** Location scope: near me / whole Bratislava / borough. */
  area: FeedAreaId;
  /** @deprecated Silent mix is always on; kept for storage backward-compat. */
  discoveryEnabled: boolean;
}

export interface FilterableEvent {
  sport: string;
  type: EventType;
  venueId: string | null;
}

export const EMPTY_HOME_FEED_FILTERS: HomeFeedFilters = {
  sports: [],
  venueIds: [],
  type: 'ALL',
  area: 'bratislava',
  discoveryEnabled: true,
};

export function parseHomeFeedFilters(params: {
  sport?: string | string[];
  venues?: string | string[];
  type?: string;
  area?: string;
  discovery?: string;
}): HomeFeedFilters {
  const rawSports = params.sport;
  const sportList = Array.isArray(rawSports)
    ? rawSports
    : rawSports
      ? rawSports.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

  const validSports = sportList
    .map((s) => s.toUpperCase())
    .filter((s): s is (typeof EVENT_SPORTS)[number] => isEventSport(s));

  const rawVenues = params.venues;
  const venueList = Array.isArray(rawVenues)
    ? rawVenues
    : rawVenues
      ? rawVenues.split(',').map((v) => v.trim()).filter(Boolean)
      : [];

  const typeParam = params.type?.toLowerCase();
  const type: EventType | 'ALL' =
    typeParam === 'official' || typeParam === 'community' ? typeParam : 'ALL';

  return {
    sports: validSports,
    venueIds: venueList,
    type,
    area: parseFeedArea(params.area),
    discoveryEnabled: true,
  };
}

export function serializeHomeFeedFilters(filters: HomeFeedFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.sports.length > 0) params.set('sport', filters.sports.join(','));
  if (filters.venueIds.length > 0) params.set('venues', filters.venueIds.join(','));
  if (filters.type !== 'ALL') params.set('type', filters.type);
  if (filters.area !== 'bratislava') params.set('area', filters.area);
  // Discovery mix is always silent/on — never expose in the URL.
  return params;
}

export function activeHomeFeedFilterCount(filters: HomeFeedFilters): number {
  let count = 0;
  if (filters.sports.length > 0) count += filters.sports.length;
  if (filters.venueIds.length > 0) count += filters.venueIds.length;
  if (filters.type !== 'ALL') count += 1;
  if (filters.area !== 'bratislava') count += 1;
  return count;
}

export function matchesHomeFeedFilters(event: FilterableEvent, filters: HomeFeedFilters): boolean {
  if (filters.type !== 'ALL' && event.type !== filters.type) return false;
  if (filters.sports.length > 0 && !filters.sports.includes(event.sport.toUpperCase())) return false;
  if (filters.venueIds.length > 0) {
    if (!event.venueId || !filters.venueIds.includes(event.venueId)) return false;
  }
  return true;
}

export function homeFeedFiltersFromStorage(): HomeFeedFilters | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(HOME_FEED_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<HomeFeedFilters> & { discovery?: string };
    return {
      sports: Array.isArray(parsed.sports) ? parsed.sports : [],
      venueIds: Array.isArray(parsed.venueIds) ? parsed.venueIds : [],
      type: parsed.type === 'official' || parsed.type === 'community' ? parsed.type : 'ALL',
      area: parseFeedArea(parsed.area),
      discoveryEnabled: true,
    };
  } catch {
    return null;
  }
}

export function saveHomeFeedFiltersToStorage(filters: HomeFeedFilters): void {
  if (typeof window === 'undefined') return;
  if (activeHomeFeedFilterCount(filters) === 0) {
    localStorage.removeItem(HOME_FEED_STORAGE_KEY);
    return;
  }
  localStorage.setItem(
    HOME_FEED_STORAGE_KEY,
    JSON.stringify({ ...filters, discoveryEnabled: true }),
  );
}

export function matchesSportFilter(sport: string, filters: HomeFeedFilters): boolean {
  if (filters.sports.length === 0) return true;
  return filters.sports.includes(sport.toUpperCase());
}

export function matchesVenueSportsFilter(venueSports: string[], filters: HomeFeedFilters): boolean {
  if (filters.sports.length === 0) return true;
  const normalized = venueSports.map((s) => s.toUpperCase());
  return filters.sports.some((s) => normalized.includes(s));
}

export function matchesCoachSportsFilter(coachSports: string[], filters: HomeFeedFilters): boolean {
  if (filters.sports.length === 0) return true;
  const normalized = coachSports.map((s) => s.toUpperCase());
  return filters.sports.some((s) => normalized.includes(s));
}

export function matchesVenueFilter(venueId: string | null | undefined, filters: HomeFeedFilters): boolean {
  if (filters.venueIds.length === 0) return true;
  if (!venueId) return false;
  return filters.venueIds.includes(venueId);
}

export function matchesTypeFilter(type: EventType, filters: HomeFeedFilters): boolean {
  if (filters.type === 'ALL') return true;
  return type === filters.type;
}

export function applyPlayerFeedFilters<T>(
  items: T[],
  filters: HomeFeedFilters,
  accessors: {
    sport: (item: T) => string;
    venueId?: (item: T) => string | null | undefined;
    type?: (item: T) => EventType;
  },
): T[] {
  return items.filter((item) => {
    if (!matchesSportFilter(accessors.sport(item), filters)) return false;
    if (accessors.venueId && !matchesVenueFilter(accessors.venueId(item), filters)) return false;
    if (accessors.type && !matchesTypeFilter(accessors.type(item), filters)) return false;
    return true;
  });
}

export function summarizeHomeFeedFilters(
  filters: HomeFeedFilters,
  venues: { id: string; name: string }[],
): string {
  if (activeHomeFeedFilterCount(filters) === 0) {
    return 'Everything in Bratislava — personalize area, sports & venues';
  }

  const parts: string[] = [feedAreaLabel(filters.area)];
  if (filters.type !== 'ALL') {
    parts.push(filters.type === 'official' ? 'Official events' : 'Community events');
  }
  if (filters.sports.length > 0) {
    parts.push(filters.sports.map(sportDisplayLabel).join(' & '));
  }
  if (filters.venueIds.length > 0) {
    const names = filters.venueIds
      .map((id) => venues.find((v) => v.id === id)?.name)
      .filter((name): name is string => Boolean(name));
    if (names.length > 0) {
      const preview = names.slice(0, 2).join(', ');
      parts.push(names.length > 2 ? `${preview} +${names.length - 2}` : preview);
    }
  }
  return parts.join(' · ');
}
