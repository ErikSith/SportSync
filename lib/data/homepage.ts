import { createClient } from '@/lib/supabase/server';
import { matchesFeedArea, resolveFeedLocation, type FeedAreaId } from '@/lib/cities';
import { getVenueIdsForDistrict } from '@/lib/data/area-feed';
import { boundingBox, distanceKm, DEFAULT_RADIUS_KM, EXTENDED_RADIUS_KM } from '@/lib/geo';
import type { EventType } from '@/lib/constants/events';
import type { EventCardData } from '@/lib/data/events';
import { ALL_EVENTS_FALLBACK_MESSAGE } from '@/lib/data/events';
import type { HomeFeedFilters } from '@/lib/home-feed-filters';
import { matchesHomeFeedFilters } from '@/lib/home-feed-filters';
import { mixMatchDiscoveryFeed } from '@/lib/feed/mix-discovery';
import {
  aggregateEventsForFeed,
  type AggregatedFeedItem,
} from '@/lib/feed/aggregate-routine-lessons';
import type { PromotedBannerItem } from '@/lib/data/promoted-types';
import { activeFeedSinceIso } from '@/lib/retention/feed-window';

export { getProfileByAuthId, type Profile } from '@/lib/data/profile';
import type { Profile } from '@/lib/data/profile';
import { getFavoriteVenues, type FavoriteVenue } from '@/lib/data/profile-venues';

export type { FavoriteVenue } from '@/lib/data/profile-venues';
export type { PromotedBannerItem } from '@/lib/data/promoted-types';

const INSPIRATION_ROW_LIMIT = 5;
/** Visual Coming up cards after routine-lesson aggregation. */
const STARTING_SOON_ROW_LIMIT = 12;
/** Raw pool so studio schedules can collapse without crowding out other events. */
const STARTING_SOON_POOL_LIMIT = 64;
const FEATURED_ROW_LIMIT = 5;
const STARTING_SOON_DAYS = 7;
const LAST_SPOTS_FILL_RATIO = 0.8;
const LAST_SPOTS_MAX_REMAINING = 2;

export interface UpcomingLobbyCard {
  id: string;
  sport: string;
  format: string;
  scheduledAt: Date;
  city: string;
  isHost: boolean;
  venueName: string | null;
}

interface LobbyRow {
  id: string;
  sport: string;
  format: string;
  scheduled_at: string;
  city: string;
  host_id: string;
  venues: { name: string } | { name: string }[] | null;
}

function venueNameFromRow(venues: LobbyRow['venues']): string | null {
  if (!venues) return null;
  if (Array.isArray(venues)) return venues[0]?.name ?? null;
  return venues.name;
}

/** "My Upcoming" — community matches the profile hosts or has joined. */
export async function getMyUpcomingLobbies(profileId: string, take = 3): Promise<UpcomingLobbyCard[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: memberships } = await supabase
    .from('lobby_participants')
    .select('lobby_id')
    .eq('user_id', profileId);

  const memberLobbyIds = (memberships ?? []).map((row) => row.lobby_id as string);
  const orParts = [`host_id.eq.${profileId}`];
  if (memberLobbyIds.length > 0) {
    orParts.push(`id.in.(${memberLobbyIds.join(',')})`);
  }

  const { data, error } = await supabase
    .from('lobbies')
    .select('id, sport, format, scheduled_at, city, host_id, venues(name)')
    .in('status', ['open', 'full', 'live'])
    .gte('scheduled_at', now)
    .or(orParts.join(','))
    .order('scheduled_at', { ascending: true })
    .limit(take);

  if (error || !data) return [];

  return data.map((lobby) => ({
    id: lobby.id as string,
    sport: lobby.sport as string,
    format: lobby.format as string,
    scheduledAt: new Date(lobby.scheduled_at as string),
    city: lobby.city as string,
    isHost: (lobby.host_id as string) === profileId,
    venueName: venueNameFromRow(lobby.venues as LobbyRow['venues']),
  }));
}

export interface FeaturedEventCard {
  id: string;
  title: string;
  description: string | null;
  sport: string;
  city: string;
  startsAt: Date;
  price: number;
  coverUrl: string | null;
  distanceKm: number;
}

export interface NearbyFeedResult<T> {
  item: T | null;
  radiusKm: number;
  showExtended: boolean;
  message?: string;
}

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  sport: string;
  sport_type: string;
  type: string;
  status: string;
  city: string;
  starts_at: string;
  price: number | string;
  price_cents: number | null;
  currency: string | null;
  cover_url: string | null;
  capacity: number | null;
  max_participants: number | null;
  registered_count: number;
  latitude: number | null;
  longitude: number | null;
  venue_id: string | null;
  theme_config: Record<string, unknown> | null;
  participation_mode?: string | null;
  ticket_url?: string | null;
  source_url?: string | null;
  source_name?: string | null;
  source?: string | null;
  external_id?: string | null;
  is_aggregated?: boolean | null;
  for_kids?: boolean | null;
  venues?: { name: string } | { name: string }[] | null;
}

function resolveVenueName(venues: EventRow['venues']): string | null {
  if (!venues) return null;
  return Array.isArray(venues) ? (venues[0]?.name ?? null) : venues.name;
}

export interface HomeFilterVenue {
  id: string;
  name: string;
  city: string;
  sports: string[];
}

export interface FeaturedEventsResult {
  events: EventCardData[];
  radiusKm: number;
  showExtended: boolean;
  message?: string;
  usedAllEventsFallback?: boolean;
}

export interface HomepageEventInspiration {
  /**
   * Paid promoted slot — kept in the model for later; UI is currently hidden
   * until event/tournament traction. Always empty from this loader for now.
   */
  promoted: PromotedBannerItem[];
  /** Official shortlist (legacy Featured row). */
  featured: FeaturedEventsResult;
  nearby: EventCardData[];
  startingSoon: EventCardData[];
  lastSpots: EventCardData[];
  anchor: { lat: number; lng: number; source: 'gps' | 'city' };
  /** Active feed area — keeps Featured UI stable while adapting copy/content. */
  area: FeedAreaId;
  areaLabel: string;
  /** True when nearby radius/city scope returned nothing and we widened to all events. */
  usedAllEventsFallback?: boolean;
  fallbackMessage?: string;
}

function normalizeEventType(type: string): EventType {
  return type === 'community' ? 'community' : 'official';
}

function toEventCard(event: EventRow, distKm: number): EventCardData {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    sport: event.sport,
    sportType: event.sport_type ?? 'OTHER',
    type: normalizeEventType(event.type),
    city: event.city,
    startsAt: new Date(event.starts_at),
    price: Number(event.price),
    priceCents: event.price_cents ?? Math.round(Number(event.price) * 100),
    currency: event.currency ?? 'EUR',
    coverUrl: event.cover_url,
    status: event.status,
    capacity: event.capacity,
    maxParticipants: event.max_participants ?? null,
    registeredCount: event.registered_count,
    distanceKm: Math.round(distKm * 10) / 10,
    latitude: event.latitude,
    longitude: event.longitude,
    venueId: event.venue_id,
    venueName: resolveVenueName(event.venues),
    themeConfig: (event.theme_config as Record<string, unknown>) ?? {},
    participationMode: event.participation_mode === 'spectator' ? 'spectator' : 'participate',
    ticketUrl: event.ticket_url ?? null,
    sourceUrl: event.source_url ?? null,
    sourceName: event.source_name ?? null,
    source: event.source ?? null,
    externalId: event.external_id ?? null,
    isAggregated: Boolean(event.is_aggregated),
    forKids: Boolean(event.for_kids),
  };
}

function applyFeedFilters(events: EventCardData[], filters?: HomeFeedFilters): EventCardData[] {
  if (!filters) return events;
  if (filters.sports.length === 0 && filters.venueIds.length === 0) {
    if (filters.type === 'ALL') return events;
    return events.filter((event) =>
      matchesHomeFeedFilters(
        { sport: event.sport, type: event.type, venueId: event.venueId },
        filters,
      ),
    );
  }
  // Silent 70/30 mix whenever sports/venues are set.
  return mixMatchDiscoveryFeed(events, filters);
}

function isStartingSoon(startsAt: Date, now: Date): boolean {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + STARTING_SOON_DAYS);
  return startsAt >= now && startsAt <= cutoff;
}

/** Flatten aggregated Coming up items back to EventCardData for the section prop. */
function flattenAggregatedFeedItems(items: AggregatedFeedItem[]): EventCardData[] {
  const out: EventCardData[] = [];
  for (const item of items) {
    if (item.kind === 'INDEPENDENT_EVENT') out.push(item.event);
    else out.push(...item.lessons);
  }
  return out;
}

function isLastSpots(event: EventCardData): boolean {
  if (event.capacity === null || event.capacity <= 0) return false;
  const spotsLeft = event.capacity - event.registeredCount;
  const fillRatio = event.registeredCount / event.capacity;
  return fillRatio >= LAST_SPOTS_FILL_RATIO || spotsLeft <= LAST_SPOTS_MAX_REMAINING;
}

function lastSpotsFillRatio(event: EventCardData): number {
  if (!event.capacity || event.capacity <= 0) return 0;
  return event.registeredCount / event.capacity;
}

/** Venues in the user's city for the homepage feed filter picker. */
export async function getVenuesForHomeFilter(city: string, take = 12): Promise<HomeFilterVenue[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('venues')
    .select('id, name, city, sports')
    .ilike('city', city)
    .order('name', { ascending: true })
    .limit(take);

  if (error || !data) {
    if (error && process.env.NODE_ENV !== 'production') {
      console.error('[homepage.getVenuesForHomeFilter]', error.message);
    }
    return [];
  }

  return data.map((venue) => ({
    id: venue.id as string,
    name: venue.name as string,
    city: venue.city as string,
    sports: (venue.sports as string[] | null) ?? [],
  }));
}

/** Favorite venues from play history + explicit picks in the feed filter. */
export async function getHomepageFavoriteVenues(
  profileId: string,
  pickedVenueIds: string[] = [],
  take = 4,
): Promise<FavoriteVenue[]> {
  const fromHistory = await getFavoriteVenues(profileId, take);
  const seen = new Set(fromHistory.map((v) => v.id));

  const extraIds = pickedVenueIds.filter((id) => !seen.has(id));
  if (extraIds.length === 0) return fromHistory.slice(0, take);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('venues')
    .select('id, name, city, sports, verified')
    .in('id', extraIds);

  if (error || !data) return fromHistory.slice(0, take);

  const pickedVenues: FavoriteVenue[] = (data as { id: string; name: string; city: string; sports: string[] | null; verified: boolean }[]).map(
    (venue) => ({
      id: venue.id,
      name: venue.name,
      city: venue.city,
      sports: venue.sports ?? [],
      verified: venue.verified,
      visits: 0,
      lastVisitedAt: null,
      topSport: venue.sports?.[0] ?? null,
    }),
  );

  const pickedFirst = [
    ...pickedVenues.filter((v) => pickedVenueIds.includes(v.id)),
    ...fromHistory,
  ];

  const deduped: FavoriteVenue[] = [];
  const added = new Set<string>();
  for (const venue of pickedFirst) {
    if (added.has(venue.id)) continue;
    added.add(venue.id);
    deduped.push(venue);
    if (deduped.length >= take) break;
  }

  return deduped;
}

async function fetchEventCandidatePool(
  lat: number,
  lng: number,
  searchRadiusKm: number,
  filters?: HomeFeedFilters,
): Promise<EventCardData[]> {
  const box = boundingBox(lat, lng, searchRadiusKm);
  const supabase = await createClient();

  const [{ data, error }, missingCoords] = await Promise.all([
    supabase
      .from('events')
      .select('*, venues(name)')
      .in('status', ['open', 'live'])
      .gte('starts_at', activeFeedSinceIso())
      .gte('latitude', box.minLat)
      .lte('latitude', box.maxLat)
      .gte('longitude', box.minLng)
      .lte('longitude', box.maxLng)
      .order('starts_at', { ascending: true })
      .limit(50),
    fetchOfficialEventsMissingCoordsPool(filters),
  ]);

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[homepage.fetchEventCandidatePool]', error.message);
    }
  }

  const geoHits = applyFeedFilters(
    ((data ?? []) as EventRow[])
      .filter((event) => event.latitude !== null && event.longitude !== null)
      .map((event) => ({
        event,
        distanceKm: distanceKm(lat, lng, event.latitude as number, event.longitude as number),
      }))
      .filter(({ distanceKm: d }) => d <= searchRadiusKm)
      .map(({ event, distanceKm: d }) => toEventCard(event, d)),
    filters,
  );

  return mergeHomepageCards(geoHits, missingCoords);
}

async function fetchOfficialEventsMissingCoordsPool(
  filters?: HomeFeedFilters,
): Promise<EventCardData[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('events')
    .select('*, venues(name)')
    .eq('type', 'official')
    .in('status', ['open', 'live'])
    .gte('starts_at', activeFeedSinceIso())
    .or('latitude.is.null,longitude.is.null')
    .order('starts_at', { ascending: true })
    .limit(50);

  if (error || !data) {
    if (error && process.env.NODE_ENV !== 'production') {
      console.error('[homepage.fetchOfficialEventsMissingCoordsPool]', error.message);
    }
    return [];
  }

  return applyFeedFilters(
    (data as EventRow[]).map((event) => toEventCard(event, 0)),
    filters,
  );
}

async function fetchAllActiveEventCandidates(
  lat: number,
  lng: number,
  filters?: HomeFeedFilters,
): Promise<EventCardData[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('events')
    .select('*, venues(name)')
    .in('status', ['open', 'live'])
    .gte('starts_at', activeFeedSinceIso())
    .order('starts_at', { ascending: true })
    .limit(120);

  if (error || !data) {
    if (error && process.env.NODE_ENV !== 'production') {
      console.error('[homepage.fetchAllActiveEventCandidates]', error.message);
    }
    return [];
  }

  return applyFeedFilters(
    (data as EventRow[]).map((event) => {
      const dist =
        event.latitude != null && event.longitude != null
          ? distanceKm(lat, lng, event.latitude, event.longitude)
          : 0;
      return toEventCard(event, dist);
    }),
    filters,
  );
}

function mergeHomepageCards(primary: EventCardData[], extra: EventCardData[]): EventCardData[] {
  const seen = new Set(primary.map((e) => e.id));
  const merged = [...primary];
  for (const event of extra) {
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    merged.push(event);
  }
  return merged;
}

/** Homepage event inspiration: featured + Near You / Starting Soon / Last Spots rows. */
export async function getHomepageEventInspiration(
  profile: Profile,
  filters?: HomeFeedFilters,
): Promise<HomepageEventInspiration | null> {
  const location = resolveFeedLocation({
    areaRaw: filters?.area,
    profileCity: profile.city,
    profileLat: profile.latitude,
    profileLng: profile.longitude,
  });

  const primaryRadius = location.radiusKm;
  const useGpsNearby = location.area === 'near_me';

  const districtVenueIds =
    location.area !== 'near_me' && location.area !== 'bratislava'
      ? new Set(await getVenueIdsForDistrict(location.area))
      : null;

  const [featuredRaw, candidatesRaw] = await Promise.all([
    useGpsNearby
      ? getFeaturedNearbyEvents(location.lat, location.lng, FEATURED_ROW_LIMIT * 3, filters, {
          primaryRadiusKm: primaryRadius,
          allowExtended: location.allowExtended,
        })
      : getFeaturedCityEvents('Bratislava', location.lat, location.lng, FEATURED_ROW_LIMIT * 3, filters),
    useGpsNearby
      ? fetchEventCandidatePool(
          location.lat,
          location.lng,
          location.allowExtended ? Math.max(primaryRadius, EXTENDED_RADIUS_KM) : primaryRadius,
          filters,
        )
      : fetchEventCandidatePoolByCity('Bratislava', location.lat, location.lng, filters),
  ]);

  const inArea = (event: EventCardData) => {
    if (districtVenueIds) {
      return event.venueId != null && districtVenueIds.has(event.venueId);
    }
    return matchesFeedArea(location, {
      lat: event.latitude,
      lng: event.longitude,
      city: event.city,
      textParts: [event.venueName, event.title],
    });
  };

  let featured = {
    ...featuredRaw,
    events: featuredRaw.events.filter(inArea).slice(0, FEATURED_ROW_LIMIT),
  };
  let candidates = candidatesRaw.filter(inArea);
  let usedAllEventsFallback = Boolean(featuredRaw.usedAllEventsFallback);

  if (candidates.length === 0 && featured.events.length === 0) {
    const allCandidates = await fetchAllActiveEventCandidates(location.lat, location.lng, filters);
    candidates = allCandidates;
    if (featured.events.length === 0) {
      featured = {
        events: allCandidates.filter((e) => e.type === 'official').slice(0, FEATURED_ROW_LIMIT),
        radiusKm: primaryRadius,
        showExtended: true,
        usedAllEventsFallback: true,
        message: ALL_EVENTS_FALLBACK_MESSAGE,
      };
    }
    usedAllEventsFallback = true;
  }

  const usedIds = new Set<string>();
  featured.events.forEach((event) => usedIds.add(event.id));

  const now = new Date();

  const startingSoonPool = candidates
    .filter((event) => !usedIds.has(event.id) && isStartingSoon(event.startsAt, now))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
    .slice(0, STARTING_SOON_POOL_LIMIT);
  const startingSoon = flattenAggregatedFeedItems(
    aggregateEventsForFeed(startingSoonPool).slice(0, STARTING_SOON_ROW_LIMIT),
  );
  startingSoon.forEach((event) => usedIds.add(event.id));

  const lastSpots = candidates
    .filter((event) => !usedIds.has(event.id) && isLastSpots(event))
    .sort((a, b) => lastSpotsFillRatio(b) - lastSpotsFillRatio(a))
    .slice(0, INSPIRATION_ROW_LIMIT);
  lastSpots.forEach((event) => usedIds.add(event.id));

  const nearby = candidates
    .filter((event) => !usedIds.has(event.id))
    .sort((a, b) => a.distanceKm - b.distanceKm || a.startsAt.getTime() - b.startsAt.getTime())
    .slice(0, INSPIRATION_ROW_LIMIT);

  return {
    // Slot parked — re-enable via getActivePromotedBanners() + PromotedBannerSection later.
    promoted: [],
    featured,
    nearby,
    startingSoon,
    lastSpots,
    area: location.area,
    areaLabel: location.label,
    usedAllEventsFallback,
    fallbackMessage: usedAllEventsFallback ? ALL_EVENTS_FALLBACK_MESSAGE : undefined,
    anchor: {
      lat: location.lat,
      lng: location.lng,
      source: location.area === 'near_me' ? 'gps' : 'city',
    },
  };
}

/** Official featured row scoped to a whole city (All Bratislava). Same card shape as nearby. */
async function getFeaturedCityEvents(
  city: string,
  lat: number,
  lng: number,
  take: number,
  filters?: HomeFeedFilters,
): Promise<FeaturedEventsResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('events')
    .select('*, venues(name)')
    .eq('type', 'official')
    .in('status', ['open', 'live'])
    .ilike('city', city)
    .gte('starts_at', activeFeedSinceIso())
    .order('starts_at', { ascending: true })
    .limit(20);

  if (error || !data) {
    if (error && process.env.NODE_ENV !== 'production') {
      console.error('[homepage.getFeaturedCityEvents]', error.message);
    }
    return { events: [], radiusKm: 0, showExtended: false };
  }

  const events = applyFeedFilters(
    (data as EventRow[]).map((event) => {
      const dist =
        event.latitude != null && event.longitude != null
          ? distanceKm(lat, lng, event.latitude, event.longitude)
          : 0;
      return toEventCard(event, dist);
    }).slice(0, take),
    filters,
  );

  return { events, radiusKm: 0, showExtended: false };
}

async function fetchEventCandidatePoolByCity(
  city: string,
  lat: number,
  lng: number,
  filters?: HomeFeedFilters,
): Promise<EventCardData[]> {
  const supabase = await createClient();
  const [{ data, error }, missingCoords] = await Promise.all([
    supabase
      .from('events')
      .select('*, venues(name)')
      .in('status', ['open', 'live'])
      .ilike('city', city)
      .gte('starts_at', activeFeedSinceIso())
      .order('starts_at', { ascending: true })
      .limit(50),
    fetchOfficialEventsMissingCoordsPool(filters),
  ]);

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[homepage.fetchEventCandidatePoolByCity]', error.message);
    }
  }

  const cityEvents = applyFeedFilters(
    ((data ?? []) as EventRow[]).map((event) => {
      const dist =
        event.latitude != null && event.longitude != null
          ? distanceKm(lat, lng, event.latitude, event.longitude)
          : 0;
      return toEventCard(event, dist);
    }),
    filters,
  );

  return mergeHomepageCards(cityEvents, missingCoords);
}

export async function getFeaturedNearbyEvents(
  lat: number,
  lng: number,
  take = FEATURED_ROW_LIMIT,
  filters?: HomeFeedFilters,
  radiusOpts?: { primaryRadiusKm?: number; allowExtended?: boolean },
): Promise<FeaturedEventsResult> {
  const primaryRadiusKm = radiusOpts?.primaryRadiusKm ?? DEFAULT_RADIUS_KM;
  const allowExtended = radiusOpts?.allowExtended ?? true;

  const within = async (radiusKm: number): Promise<EventCardData[]> => {
    const box = boundingBox(lat, lng, radiusKm);
    const supabase = await createClient();
    const [{ data }, missingCoords] = await Promise.all([
      supabase
        .from('events')
        .select('*, venues(name)')
        .eq('type', 'official')
        .in('status', ['open', 'live'])
        .gte('starts_at', activeFeedSinceIso())
        .gte('latitude', box.minLat)
        .lte('latitude', box.maxLat)
        .gte('longitude', box.minLng)
        .lte('longitude', box.maxLng)
        .order('starts_at', { ascending: true })
        .limit(20),
      fetchOfficialEventsMissingCoordsPool(filters),
    ]);

    const geoHits = applyFeedFilters(
      (data as EventRow[] | null)
        ?.filter((event) => event.latitude !== null && event.longitude !== null)
        .map((event) => ({
          event,
          distanceKm: distanceKm(lat, lng, event.latitude as number, event.longitude as number),
        }))
        .filter(({ distanceKm: d }) => d <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, take)
        .map(({ event, distanceKm: d }) => toEventCard(event, d)) ?? [],
      filters,
    );

    return mergeHomepageCards(geoHits, missingCoords).slice(0, take);
  };

  const nearby = await within(primaryRadiusKm);
  if (nearby.length > 0) {
    return { events: nearby, radiusKm: primaryRadiusKm, showExtended: false };
  }

  if (allowExtended) {
    const extended = await within(EXTENDED_RADIUS_KM);
    if (extended.length > 0) {
      return {
        events: extended,
        radiusKm: EXTENDED_RADIUS_KM,
        showExtended: true,
        message: `Nothing nearby? Check out matches ${EXTENDED_RADIUS_KM}km away.`,
      };
    }
  }

  const allOfficial = (await fetchAllActiveEventCandidates(lat, lng, filters))
    .filter((event) => event.type === 'official')
    .slice(0, take);

  return {
    events: allOfficial,
    radiusKm: primaryRadiusKm,
    showExtended: true,
    usedAllEventsFallback: true,
    message: ALL_EVENTS_FALLBACK_MESSAGE,
  };
}

/** @deprecated Use getFeaturedNearbyEvents — kept for single-item callers if needed. */
export async function getFeaturedNearbyEvent(lat: number, lng: number): Promise<NearbyFeedResult<FeaturedEventCard>> {
  const result = await getFeaturedNearbyEvents(lat, lng, 1);
  const first = result.events[0];
  return {
    item: first
      ? {
          id: first.id,
          title: first.title,
          description: first.description,
          sport: first.sport,
          city: first.city,
          startsAt: first.startsAt,
          price: first.price,
          coverUrl: first.coverUrl,
          distanceKm: first.distanceKm,
        }
      : null,
    radiusKm: result.radiusKm,
    showExtended: result.showExtended,
    message: result.message,
  };
}

function toFeaturedCard(event: EventRow, distKm: number): FeaturedEventCard {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    sport: event.sport,
    city: event.city,
    startsAt: new Date(event.starts_at),
    price: Number(event.price),
    coverUrl: event.cover_url,
    distanceKm: Math.round(distKm * 10) / 10,
  };
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  karmaScore: number;
}

export async function getTopProfilesByCity(city: string, take = 3): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url, role, karma_score')
    .ilike('city', city)
    .order('karma_score', { ascending: false })
    .limit(take);

  if (error || !data) {
    if (error && process.env.NODE_ENV !== 'production') console.error('[homepage.getTopProfilesByCity]', error.message);
    return [];
  }

  return data.map((profile, index) => ({
    rank: index + 1,
    id: profile.id as string,
    name: (profile.full_name as string | null) ?? (profile.username as string),
    avatarUrl: profile.avatar_url as string | null,
    role: profile.role as string,
    karmaScore: Number(profile.karma_score ?? 0),
  }));
}
