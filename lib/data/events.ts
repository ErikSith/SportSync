import { createClient } from '@/lib/supabase/server';
import { boundingBox, distanceKm, DEFAULT_RADIUS_KM, EXTENDED_RADIUS_KM } from '@/lib/geo';
import type { EventType } from '@/lib/constants/events';
import { activeFeedSince, feedStartsAtFloor } from '@/lib/retention/feed-window';
import { parseDbInstant, alignStartsAtWithCopyTime } from '@/lib/datetime/bratislava';
import { sanitizeListingCoverUrl, sanitizeListingPhotos } from '@/lib/media/listing-cover';
import { listingParticipationMode } from '@/lib/participation/fixture-match';

export { EVENT_SPORTS, type EventSport } from '@/lib/constants/sports';

export type ParticipationMode = 'spectator' | 'participate';

export type EventDiscoveryReason = 'new' | 'filling_fast' | 'popular';

export interface EventCardData {
  id: string;
  title: string;
  description: string | null;
  sport: string;
  sportType: string;
  type: EventType;
  city: string;
  startsAt: Date;
  price: number;
  priceCents: number;
  currency: string;
  coverUrl: string | null;
  status: string;
  capacity: number | null;
  maxParticipants: number | null;
  registeredCount: number;
  distanceKm: number;
  latitude: number | null;
  longitude: number | null;
  venueId: string | null;
  venueName: string | null;
  themeConfig: Record<string, unknown>;
  participationMode: ParticipationMode;
  ticketUrl: string | null;
  sourceUrl: string | null;
  sourceName: string | null;
  source: string | null;
  /** Scrape adapter external id — e.g. `class-…` for FitCamp lessons, `event-…` for one-offs. */
  externalId: string | null;
  isAggregated: boolean;
  /** Kids-oriented activity (Kidstown / pre deti). */
  forKids: boolean;
  /** Women-only activity (pre ženy / ladies only). */
  forWomen: boolean;
  /** Present when Mixed Feed Engine injected this card outside sport/venue prefs. */
  isDiscovery?: boolean;
  discoveryReason?: EventDiscoveryReason;
}

export const ALL_EVENTS_FALLBACK_MESSAGE = 'Showing all available events';

export interface EventFeedResult {
  events: EventCardData[];
  radiusKm: number;
  showExtended: boolean;
  message?: string;
  /** True when the feed widened beyond GPS / city scope because nearby was empty. */
  usedAllEventsFallback?: boolean;
}

export interface EventFeedQuery {
  lat: number;
  lng: number;
  sport?: string;
  search?: string;
  type?: EventType | 'ALL';
  participationMode?: ParticipationMode | 'all';
  dateWindow?: 'today' | 'tomorrow' | 'weekend' | 'all';
  city?: string;
  /** Override default 20km nearby radius (e.g. borough ~4km). */
  radiusKm?: number;
  /** When false, do not fall back to the 50km extended radius. */
  allowExtended?: boolean;
}

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  sport: string;
  sport_type: string;
  type: string;
  city: string;
  starts_at: string;
  price: number | string;
  price_cents: number | null;
  currency: string | null;
  cover_url: string | null;
  status: string;
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
  for_women?: boolean | null;
  venues?: { name: string } | { name: string }[] | null;
}

function resolveVenueName(venues: EventRow['venues']): string | null {
  if (!venues) return null;
  return Array.isArray(venues) ? (venues[0]?.name ?? null) : venues.name;
}

function dateWindowBounds(window: EventFeedQuery['dateWindow']): { from: Date; to: Date } | null {
  if (!window || window === 'all') return null;
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);

  if (window === 'today') {
    end.setHours(23, 59, 59, 999);
    // Grace floor keeps events that started within the last ~2h visible.
    return { from: activeFeedSince(now), to: end };
  }
  if (window === 'tomorrow') {
    start.setDate(start.getDate() + 1);
    end.setDate(start.getDate());
    end.setHours(23, 59, 59, 999);
    return { from: start, to: end };
  }
  // weekend: upcoming Sat–Sun (or remaining weekend if already Sat/Sun)
  const day = now.getDay();
  const toSat = day === 6 ? 0 : day === 0 ? -1 : 6 - day;
  const sat = new Date(start);
  sat.setDate(start.getDate() + toSat);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  sun.setHours(23, 59, 59, 999);
  const from = sat < now ? now : sat;
  return { from, to: sun };
}

function mapEventCard(event: EventRow, d: number): EventCardData {
  const startsAt = alignStartsAtWithCopyTime(
    parseDbInstant(event.starts_at),
    event.description,
  );
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    sport: event.sport,
    sportType: event.sport_type ?? 'OTHER',
    type: normalizeEventType(event.type),
    city: event.city,
    startsAt,
    price: Number(event.price),
    priceCents: event.price_cents ?? Math.round(Number(event.price) * 100),
    currency: event.currency ?? 'EUR',
    coverUrl: sanitizeListingCoverUrl(event.cover_url, {
      source: event.source,
      sourceUrl: event.source_url,
      ticketUrl: event.ticket_url,
      venueName: resolveVenueName(event.venues),
      title: event.title,
    }),
    status: event.status,
    capacity: event.capacity,
    maxParticipants: event.max_participants ?? null,
    registeredCount: event.registered_count,
    distanceKm: Math.round(d * 10) / 10,
    latitude: event.latitude,
    longitude: event.longitude,
    venueId: event.venue_id,
    venueName: resolveVenueName(event.venues),
    themeConfig: (event.theme_config as Record<string, unknown>) ?? {},
    participationMode: listingParticipationMode(event.title, event.participation_mode),
    ticketUrl: event.ticket_url ?? null,
    sourceUrl: event.source_url ?? null,
    sourceName: event.source_name ?? null,
    source: event.source ?? null,
    externalId: event.external_id ?? null,
    isAggregated: Boolean(event.is_aggregated),
    forKids: Boolean(event.for_kids),
    forWomen: Boolean(event.for_women),
  };
}

function normalizeEventType(type: string): EventType {
  return type === 'community' ? 'community' : 'official';
}

function matchesEventSearch(event: EventRow, search: string | undefined): boolean {
  if (!search) return true;
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  const venueName = resolveVenueName(event.venues)?.toLowerCase() ?? '';
  return (
    event.title.toLowerCase().includes(needle) ||
    (event.city ?? '').toLowerCase().includes(needle) ||
    event.sport.toLowerCase().includes(needle) ||
    venueName.includes(needle)
  );
}

function applyEventQueryFilters<T extends { eq: (column: string, value: string) => T; ilike: (column: string, value: string) => T }>(
  request: T,
  query: Pick<EventFeedQuery, 'type' | 'sport' | 'participationMode'>,
): T {
  let next = request;
  if (query.type && query.type !== 'ALL') {
    next = next.eq('type', query.type);
  }
  if (query.sport && query.sport !== 'ALL') {
    next = next.ilike('sport', query.sport);
  }
  if (query.participationMode && query.participationMode !== 'all') {
    next = next.eq('participation_mode', query.participationMode);
  }
  return next;
}

/**
 * Official / scraped events often lack GPS. Keep them visible alongside radius hits
 * so discovery is not empty when only geo-complete rows would otherwise qualify.
 */
async function fetchOfficialEventsMissingCoords(
  query: Pick<EventFeedQuery, 'type' | 'sport' | 'participationMode' | 'dateWindow' | 'search'> & {
    lat?: number;
    lng?: number;
  },
): Promise<EventCardData[]> {
  if (query.type && query.type !== 'ALL' && query.type !== 'official') return [];

  const supabase = await createClient();
  const bounds = dateWindowBounds(query.dateWindow);
  let request = supabase
    .from('events')
    .select('*, venues ( name )')
    .eq('type', 'official')
    .in('status', ['open', 'live'])
    .gte('starts_at', feedStartsAtFloor(bounds?.from ?? null))
    .or('latitude.is.null,longitude.is.null')
    .order('starts_at', { ascending: true })
    .limit(400);

  if (bounds) {
    request = request.lte('starts_at', bounds.to.toISOString());
  }
  request = applyEventQueryFilters(request, { ...query, type: 'official' });

  const { data, error } = await request;
  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[events.fetchOfficialEventsMissingCoords]', error.message);
    }
    return [];
  }

  return ((data ?? []) as EventRow[])
    .filter((event) => matchesEventSearch(event, query.search))
    .map((event) => mapEventCard(event, 0));
}

function mergeEventCards(primary: EventCardData[], extra: EventCardData[]): EventCardData[] {
  const seen = new Set(primary.map((e) => e.id));
  const merged = [...primary];
  for (const event of extra) {
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    merged.push(event);
  }
  return merged;
}

async function findWithinRadius(query: EventFeedQuery, radiusKm: number): Promise<EventCardData[]> {
  const box = boundingBox(query.lat, query.lng, radiusKm);
  const supabase = await createClient();
  const bounds = dateWindowBounds(query.dateWindow);

  let request = supabase
    .from('events')
    .select('*, venues ( name )')
    .in('status', ['open', 'live'])
    .gte('starts_at', feedStartsAtFloor(bounds?.from ?? null))
    .gte('latitude', box.minLat)
    .lte('latitude', box.maxLat)
    .gte('longitude', box.minLng)
    .lte('longitude', box.maxLng)
    .order('starts_at', { ascending: true })
    .limit(400);

  if (bounds) {
    request = request.lte('starts_at', bounds.to.toISOString());
  }
  request = applyEventQueryFilters(request, query);

  const [{ data, error }, missingCoords] = await Promise.all([
    request,
    fetchOfficialEventsMissingCoords(query),
  ]);

  if (error) {
    if (process.env.NODE_ENV !== 'production') console.error('[events.findWithinRadius]', error.message);
  }

  const geoHits = ((data ?? []) as EventRow[])
    .filter((event) => event.latitude !== null && event.longitude !== null)
    .map((event) => ({
      event,
      distanceKm: distanceKm(query.lat, query.lng, event.latitude as number, event.longitude as number),
    }))
    .filter(({ distanceKm: d }) => d <= radiusKm)
    .filter(({ event }) => matchesEventSearch(event, query.search))
    .sort((a, b) => a.distanceKm - b.distanceKm || a.event.starts_at.localeCompare(b.event.starts_at))
    .map(({ event, distanceKm: d }) => mapEventCard(event, d));

  return mergeEventCards(geoHits, missingCoords);
}

/** Active open/live events across all cities — GPS-independent discovery fallback. */
export async function getAllActiveEventsFeed(
  query: Omit<EventFeedQuery, 'lat' | 'lng'> & { lat?: number; lng?: number } = {},
): Promise<EventFeedResult> {
  try {
    // Prefer shared Edge-safe path (null coords kept; never throws).
    const { getAllActiveEventsFeedSafe } = await import('@/lib/data/fetch-active-events');
    const feed = await getAllActiveEventsFeedSafe({
      lat: query.lat,
      lng: query.lng,
      type: query.type,
      participationMode: query.participationMode,
    });

    if (!query.search?.trim()) return feed;

    const needle = query.search.trim().toLowerCase();
    return {
      ...feed,
      events: feed.events.filter((event) => {
        const hay = `${event.title} ${event.city} ${event.sport} ${event.venueName ?? ''}`.toLowerCase();
        return hay.includes(needle);
      }),
    };
  } catch (error) {
    console.error('[events.getAllActiveEventsFeed]', error);
    return {
      events: [],
      radiusKm: 0,
      showExtended: true,
      usedAllEventsFallback: true,
      message: ALL_EVENTS_FALLBACK_MESSAGE,
    };
  }
}

/** City-first Bratislava discover feed (no GPS required). */
export async function getCityEventsFeed(
  query: Omit<EventFeedQuery, 'lat' | 'lng'> & { city?: string; lat?: number; lng?: number },
): Promise<EventFeedResult> {
  const city = query.city ?? 'Bratislava';
  const supabase = await createClient();
  const bounds = dateWindowBounds(query.dateWindow);

  let request = supabase
    .from('events')
    .select('*, venues ( name )')
    .in('status', ['open', 'live'])
    .ilike('city', city)
    .gte('starts_at', feedStartsAtFloor(bounds?.from ?? null))
    .order('starts_at', { ascending: true })
    .limit(400);

  if (bounds) {
    request = request.lte('starts_at', bounds.to.toISOString());
  }
  if (query.type && query.type !== 'ALL') {
    request = request.eq('type', query.type);
  }
  if (query.sport && query.sport !== 'ALL') {
    request = request.ilike('sport', query.sport);
  }
  if (query.participationMode && query.participationMode !== 'all') {
    request = request.eq('participation_mode', query.participationMode);
  }

  const [{ data, error }, missingCoords] = await Promise.all([
    request,
    fetchOfficialEventsMissingCoords(query),
  ]);

  if (error) {
    if (process.env.NODE_ENV !== 'production') console.error('[events.getCityEventsFeed]', error.message);
    return getAllActiveEventsFeed(query);
  }

  const lat = query.lat ?? 48.1486;
  const lng = query.lng ?? 17.1077;

  const cityEvents = ((data ?? []) as EventRow[])
    .filter((event) => matchesEventSearch(event, query.search))
    .map((event) => {
      const d =
        event.latitude != null && event.longitude != null
          ? distanceKm(lat, lng, event.latitude, event.longitude)
          : 0;
      return mapEventCard(event, d);
    });

  const events = mergeEventCards(cityEvents, missingCoords);
  if (events.length === 0) {
    return getAllActiveEventsFeed(query);
  }

  return { events, radiusKm: 0, showExtended: false };
}

/** Events hosted at specific venues (district / borough scope via venues.district). */
export async function getEventsAtVenuesFeed(query: {
  venueIds: string[];
  lat?: number;
  lng?: number;
  type?: EventType | 'ALL';
  participationMode?: ParticipationMode | 'all';
  sport?: string;
  dateWindow?: EventFeedQuery['dateWindow'];
}): Promise<EventFeedResult> {
  if (query.venueIds.length === 0) {
    return { events: [], radiusKm: 0, showExtended: false };
  }

  const supabase = await createClient();
  const bounds = dateWindowBounds(query.dateWindow);
  const lat = query.lat ?? 48.1486;
  const lng = query.lng ?? 17.1077;

  let request = supabase
    .from('events')
    .select('*, venues ( name )')
    .in('status', ['open', 'live'])
    .in('venue_id', query.venueIds)
    .gte('starts_at', feedStartsAtFloor(bounds?.from ?? null))
    .order('starts_at', { ascending: true })
    .limit(400);

  if (bounds) {
    request = request.lte('starts_at', bounds.to.toISOString());
  }
  if (query.type && query.type !== 'ALL') {
    request = request.eq('type', query.type);
  }
  if (query.sport && query.sport !== 'ALL') {
    request = request.ilike('sport', query.sport);
  }
  if (query.participationMode && query.participationMode !== 'all') {
    request = request.eq('participation_mode', query.participationMode);
  }

  const { data, error } = await request;
  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[events.getEventsAtVenuesFeed]', error.message);
    }
    return { events: [], radiusKm: 0, showExtended: false, message: error.message };
  }

  const events = ((data ?? []) as EventRow[]).map((event) => {
    const d =
      event.latitude != null && event.longitude != null
        ? distanceKm(lat, lng, event.latitude, event.longitude)
        : 0;
    return mapEventCard(event, d);
  });

  return { events, radiusKm: 0, showExtended: false };
}

/** Nearby event feed with 20km → 50km → all-events fallback. */
export async function getNearbyEventsFeed(query: EventFeedQuery): Promise<EventFeedResult> {
  const primaryRadius = query.radiusKm ?? DEFAULT_RADIUS_KM;
  const nearby = await findWithinRadius(query, primaryRadius);
  if (nearby.length > 0) {
    return { events: nearby, radiusKm: primaryRadius, showExtended: false };
  }

  if (query.allowExtended !== false) {
    const extended = await findWithinRadius(query, EXTENDED_RADIUS_KM);
    if (extended.length > 0) {
      return {
        events: extended,
        radiusKm: EXTENDED_RADIUS_KM,
        showExtended: true,
        message: `Nothing nearby? Check out matches ${EXTENDED_RADIUS_KM}km away.`,
      };
    }
  }

  const all = await getAllActiveEventsFeed(query);
  return {
    ...all,
    radiusKm: primaryRadius,
    showExtended: true,
    usedAllEventsFallback: true,
    message: ALL_EVENTS_FALLBACK_MESSAGE,
  };
}

/** Official venue event feed with 20km → 50km fallback. Uses Supabase REST + RLS. */
export async function getNearbyOfficialEventsFeed(query: EventFeedQuery): Promise<EventFeedResult> {
  return getNearbyEventsFeed({ ...query, type: 'official' });
}

export interface EventSponsorData {
  id: string;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  tier: string;
}

export interface EventDetailData {
  id: string;
  title: string;
  description: string | null;
  sport: string;
  sportType: string;
  type: EventType;
  status: string;
  city: string;
  price: number;
  priceCents: number;
  currency: string;
  coverUrl: string | null;
  capacity: number | null;
  maxParticipants: number | null;
  registeredCount: number;
  startsAt: Date;
  eventDate: Date | null;
  startTime: Date | null;
  endTime: Date | null;
  entryRequirements: string | null;
  venueName: string | null;
  venueAddress: string | null;
  venueCity: string | null;
  organizerId: string;
  organizerName: string;
  photos: string[];
  sponsors: EventSponsorData[];
  themeConfig: Record<string, unknown>;
  sponsorsJson: SponsorExtracted[];
  participationMode: ParticipationMode;
  ticketUrl: string | null;
  sourceUrl: string | null;
  sourceName: string | null;
  source: string | null;
  isAggregated: boolean;
}

export interface SponsorExtracted {
  name: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  tier?: string;
}

interface VenueDetailSnippet {
  name: string;
  address: string | null;
  city: string;
}

interface OrganizerSnippet {
  full_name: string | null;
  username: string;
}

interface EventDetailRow {
  id: string;
  organizer_id: string;
  title: string;
  description: string | null;
  sport: string;
  sport_type: string;
  type: string;
  status: string;
  city: string;
  price: number | string;
  price_cents: number | null;
  currency: string | null;
  cover_url: string | null;
  capacity: number | null;
  max_participants: number | null;
  registered_count: number;
  starts_at: string;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  entry_requirements: string | null;
  theme_config: Record<string, unknown> | null;
  sponsors_json: SponsorExtracted[] | null;
  venues: VenueDetailSnippet | VenueDetailSnippet[] | null;
  profiles: OrganizerSnippet | OrganizerSnippet[] | null;
}

function resolveVenue(venues: EventDetailRow['venues']): VenueDetailSnippet | null {
  if (!venues) return null;
  return Array.isArray(venues) ? (venues[0] ?? null) : venues;
}

function resolveOrganizer(profiles: EventDetailRow['profiles']): OrganizerSnippet | null {
  if (!profiles) return null;
  return Array.isArray(profiles) ? (profiles[0] ?? null) : profiles;
}

const EVENT_DETAIL_SELECT = `
      *,
      venues ( name, address, city ),
      profiles!events_organizer_id_fkey ( full_name, username ),
      event_sponsors ( id, name, logo_url, website_url, tier )
    `;

function mapEventDetail(data: unknown): EventDetailData {
  const row = data as EventDetailRow & {
    photos?: string[] | null;
    participation_mode?: string | null;
    ticket_url?: string | null;
    source_url?: string | null;
    source_name?: string | null;
    source?: string | null;
    is_aggregated?: boolean | null;
    event_sponsors?: Array<{
      id: string;
      name: string;
      logo_url: string | null;
      website_url: string | null;
      tier: string;
    }> | null;
  };
  const venue = resolveVenue(row.venues);
  const organizer = resolveOrganizer(row.profiles);

  const sponsors: EventSponsorData[] = (row.event_sponsors ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    logoUrl: s.logo_url,
    websiteUrl: s.website_url,
    tier: s.tier,
  }));

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    sport: row.sport,
    sportType: row.sport_type ?? 'OTHER',
    type: normalizeEventType(row.type),
    status: row.status,
    city: row.city,
    price: Number(row.price),
    priceCents: row.price_cents ?? Math.round(Number(row.price) * 100),
    currency: row.currency ?? 'EUR',
    coverUrl: sanitizeListingCoverUrl(row.cover_url, {
      source: row.source,
      sourceUrl: row.source_url,
      ticketUrl: row.ticket_url,
      venueName: venue?.name ?? null,
      title: row.title,
    }),
    capacity: row.capacity,
    maxParticipants: row.max_participants ?? null,
    registeredCount: row.registered_count,
    startsAt: parseDbInstant(row.starts_at),
    eventDate: row.event_date ? parseDbInstant(row.event_date) : null,
    startTime: row.start_time ? parseDbInstant(row.start_time) : null,
    endTime: row.end_time ? parseDbInstant(row.end_time) : null,
    entryRequirements: row.entry_requirements ?? null,
    venueName: venue?.name ?? null,
    venueAddress: venue?.address ?? null,
    venueCity: venue?.city ?? null,
    organizerId: (row.organizer_id as string | null) ?? '',
    organizerName: organizer?.full_name ?? organizer?.username ?? 'Unknown',
    photos: sanitizeListingPhotos(row.photos, {
      source: row.source,
      sourceUrl: row.source_url,
      ticketUrl: row.ticket_url,
      venueName: venue?.name ?? null,
      title: row.title,
    }),
    sponsors,
    themeConfig: (row.theme_config as Record<string, unknown>) ?? {},
    sponsorsJson: (row.sponsors_json as SponsorExtracted[]) ?? [],
    participationMode: listingParticipationMode(row.title, row.participation_mode),
    ticketUrl: row.ticket_url ?? null,
    sourceUrl: row.source_url ?? null,
    sourceName: row.source_name ?? null,
    source: row.source ?? null,
    isAggregated: Boolean(row.is_aggregated),
  };
}

/** Single official/community event with venue and organizer details. */
export async function getEventById(id: string): Promise<EventDetailData | null> {
  const supabase = await createClient();

  const run = (select: string) =>
    supabase.from('events').select(select).eq('id', id).maybeSingle();

  let { data, error } = await run(EVENT_DETAIL_SELECT);

  // Join/RLS on profiles or sponsors can fail for scraped rows — retry bare.
  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[events.getEventById] embed query', error.message);
    }
    ({ data, error } = await run('*'));
  }

  if (error || !data) {
    if (error && process.env.NODE_ENV !== 'production') {
      console.error('[events.getEventById]', error.message);
    }
    return null;
  }

  return mapEventDetail(data);
}
