import { createClient } from '@/lib/supabase/server';
import { boundingBox, distanceKm, DEFAULT_RADIUS_KM, EXTENDED_RADIUS_KM } from '@/lib/geo';
import { activeFeedSinceIso } from '@/lib/retention/events';

export interface VenueCardData {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string;
  sports: string[];
  verified: boolean;
  distanceKm: number;
  latitude: number | null;
  longitude: number | null;
  openingHoursSummary: string | null;
  coverUrl: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  amenities: AmenityItem[];
  /** Upcoming hosted activity peeks (events + cups) for card cover preview. */
  activities: VenueCardActivity[];
  eventCount: number;
  tournamentCount: number;
}

/** Lightweight peek used on venue discovery cards (ISO dates for client boundary). */
export interface VenueCardActivity {
  kind: 'event' | 'tournament';
  id: string;
  title: string;
  sport: string;
  startsAt: string;
  coverUrl: string | null;
}

export interface VenueFeedResult {
  venues: VenueCardData[];
  radiusKm: number;
  showExtended: boolean;
  message?: string;
}

export interface AmenityItem {
  key: string;
  label: string;
  icon: string;
}

export interface OpeningHourEntry {
  label: string;
  hours: string;
}

export interface VenueEventPreview {
  id: string;
  title: string;
  sport: string;
  startsAt: Date;
  status: string;
}

export interface VenueLobbyPreview {
  id: string;
  sport: string;
  format: string;
  scheduledAt: Date;
  status: string;
  spotsTotal: number;
  spotsFilled: number;
}

export interface VenueTournamentPreview {
  id: string;
  name: string;
  sport: string;
  startsAt: Date;
  status: string;
}

export interface VenueDetail {
  id: string;
  ownerId: string | null;
  name: string;
  description: string | null;
  address: string | null;
  city: string;
  sports: string[];
  verified: boolean;
  amenities: AmenityItem[];
  openingHours: OpeningHourEntry[];
  latitude: number | null;
  longitude: number | null;
  coverUrl: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  upcomingEvents: VenueEventPreview[];
  upcomingTournaments: VenueTournamentPreview[];
  upcomingLobbies: VenueLobbyPreview[];
}

interface VenueFeedQuery {
  lat: number;
  lng: number;
  sport?: string;
  search?: string;
  radiusKm?: number;
  allowExtended?: boolean;
}

interface VenueRow {
  id: string;
  name: string;
  description: string | null;
  address?: string | null;
  city: string;
  sports: string[] | null;
  verified: boolean;
  amenities?: unknown;
  opening_hours: Record<string, unknown> | null;
  latitude: number | null;
  longitude: number | null;
  cover_url?: string | null;
  logo_url?: string | null;
  website_url?: string | null;
}

interface EventPreviewRow {
  id: string;
  title: string;
  sport: string;
  starts_at: string;
  status: string;
}

interface TournamentPreviewRow {
  id: string;
  name: string;
  sport: string;
  starts_at: string;
  status: string;
}

interface LobbyPreviewRow {
  id: string;
  sport: string;
  format: string;
  scheduled_at: string;
  status: string;
  spots_total: number;
  spots_filled: number;
}

const AMENITY_LABELS: Record<string, { label: string; icon: string }> = {
  parking: { label: 'Parking', icon: 'local_parking' },
  showers: { label: 'Showers', icon: 'shower' },
  proShop: { label: 'Pro Shop', icon: 'storefront' },
  pro_shop: { label: 'Pro Shop', icon: 'storefront' },
  floodlights: { label: 'Floodlights', icon: 'light_mode' },
  pool: { label: 'Olympic Pool', icon: 'pool' },
  spa: { label: 'Recovery Spa', icon: 'spa' },
  restaurant: { label: 'Nutrition Bar', icon: 'restaurant' },
  fitness_center: { label: 'HIIT Studio', icon: 'fitness_center' },
  tennis: { label: 'Pro Tennis Courts', icon: 'sports_tennis' },
};

const OPENING_HOUR_LABELS: Record<string, string> = {
  mon_fri: 'Monday - Friday',
  monday_friday: 'Monday - Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
  sat_sun: 'Saturday - Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
};

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatOpeningHoursSummary(hours: Record<string, unknown> | null): string | null {
  if (!hours || typeof hours !== 'object') return null;

  const values = Object.values(hours).filter((value): value is string => typeof value === 'string');
  if (values.length === 0) return null;

  const normalized = values.map((value) => value.toLowerCase());
  if (normalized.every((value) => value.includes('24/7') || value === '00:00-24:00' || value === '24h')) {
    return 'Open 24/7';
  }

  const first = values[0];
  return first ? first.replace('-', ' - ') : null;
}

export function parseOpeningHours(hours: Record<string, unknown> | null): OpeningHourEntry[] {
  if (!hours || typeof hours !== 'object') return [];

  return Object.entries(hours)
    .filter(([, value]) => typeof value === 'string')
    .map(([key, value]) => ({
      label: OPENING_HOUR_LABELS[key] ?? humanizeKey(key),
      hours: (value as string).replace('-', ' - '),
    }));
}

export function parseAmenities(raw: unknown): AmenityItem[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.map((item, index) => {
      if (typeof item === 'string') {
        const meta = AMENITY_LABELS[item] ?? AMENITY_LABELS[item.toLowerCase()];
        return {
          key: `${item}-${index}`,
          label: meta?.label ?? humanizeKey(item),
          icon: meta?.icon ?? 'check_circle',
        };
      }

      if (item && typeof item === 'object' && 'name' in item) {
        const name = String((item as { name: string }).name);
        const icon = 'icon' in item ? String((item as { icon: string }).icon) : 'check_circle';
        return { key: `${name}-${index}`, label: name, icon };
      }

      return { key: `amenity-${index}`, label: 'Amenity', icon: 'check_circle' };
    });
  }

  if (typeof raw === 'object') {
    return Object.entries(raw as Record<string, unknown>)
      .filter(([, value]) => value === true || (typeof value === 'string' && value.length > 0))
      .map(([key, value]) => {
        const meta = AMENITY_LABELS[key] ?? AMENITY_LABELS[key.toLowerCase()];
        return {
          key,
          label: meta?.label ?? humanizeKey(key),
          icon: meta?.icon ?? 'check_circle',
        };
      });
  }

  return [];
}

function matchesSport(sports: string[] | null, sport?: string): boolean {
  if (!sport || sport === 'ALL') return true;
  if (!sports?.length) return false;
  const needle = sport.toLowerCase();
  return sports.some((entry) => entry.toLowerCase() === needle);
}

function mapVenueCard(row: VenueRow, distance: number): VenueCardData {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    address: row.address ?? null,
    city: row.city,
    sports: row.sports ?? [],
    verified: row.verified,
    distanceKm: Math.round(distance * 10) / 10,
    latitude: row.latitude,
    longitude: row.longitude,
    openingHoursSummary: formatOpeningHoursSummary(row.opening_hours),
    coverUrl: row.cover_url ?? null,
    logoUrl: row.logo_url ?? null,
    websiteUrl: row.website_url ?? null,
    amenities: parseAmenities(row.amenities).slice(0, 4),
    activities: [],
    eventCount: 0,
    tournamentCount: 0,
  };
}

const ACTIVITY_PEEK_PER_VENUE = 4;

interface ActivityRow {
  id: string;
  venue_id: string;
  title?: string;
  name?: string;
  sport: string;
  starts_at: string;
  cover_url: string | null;
}

/** Batch-attach upcoming events + tournaments to venue cards (one query each). */
async function attachVenueActivities(venues: VenueCardData[]): Promise<VenueCardData[]> {
  if (venues.length === 0) return venues;

  const ids = venues.map((v) => v.id);
  const activeSince = activeFeedSinceIso();
  const supabase = await createClient();

  const [eventsRes, tournamentsRes] = await Promise.all([
    supabase
      .from('events')
      .select('id, venue_id, title, sport, starts_at, cover_url, status')
      .in('venue_id', ids)
      .in('status', ['open', 'live', 'full'])
      .gte('starts_at', activeSince)
      .order('starts_at', { ascending: true })
      .limit(Math.min(200, ids.length * 8)),
    supabase
      .from('tournaments')
      .select('id, venue_id, name, sport, starts_at, cover_url, status')
      .in('venue_id', ids)
      .in('status', ['REGISTRATION_OPEN', 'IN_PROGRESS'])
      .gte('starts_at', activeSince)
      .order('starts_at', { ascending: true })
      .limit(Math.min(200, ids.length * 8)),
  ]);

  if (eventsRes.error && process.env.NODE_ENV !== 'production') {
    console.error('[venues.attachVenueActivities.events]', eventsRes.error.message);
  }
  if (tournamentsRes.error && process.env.NODE_ENV !== 'production') {
    console.error('[venues.attachVenueActivities.tournaments]', tournamentsRes.error.message);
  }

  const byVenue = new Map<string, { events: VenueCardActivity[]; cups: VenueCardActivity[]; eventCount: number; tournamentCount: number }>();
  for (const id of ids) {
    byVenue.set(id, { events: [], cups: [], eventCount: 0, tournamentCount: 0 });
  }

  for (const row of (eventsRes.data ?? []) as ActivityRow[]) {
    const bucket = byVenue.get(row.venue_id);
    if (!bucket) continue;
    bucket.eventCount += 1;
    if (bucket.events.length >= ACTIVITY_PEEK_PER_VENUE) continue;
    bucket.events.push({
      kind: 'event',
      id: row.id,
      title: row.title ?? 'Event',
      sport: row.sport,
      startsAt: row.starts_at,
      coverUrl: row.cover_url,
    });
  }

  for (const row of (tournamentsRes.data ?? []) as ActivityRow[]) {
    const bucket = byVenue.get(row.venue_id);
    if (!bucket) continue;
    bucket.tournamentCount += 1;
    if (bucket.cups.length >= ACTIVITY_PEEK_PER_VENUE) continue;
    bucket.cups.push({
      kind: 'tournament',
      id: row.id,
      title: row.name ?? 'Tournament',
      sport: row.sport,
      startsAt: row.starts_at,
      coverUrl: row.cover_url,
    });
  }

  return venues.map((venue) => {
    const bucket = byVenue.get(venue.id) ?? {
      events: [],
      cups: [],
      eventCount: 0,
      tournamentCount: 0,
    };
    const merged = [...bucket.events, ...bucket.cups].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
    return {
      ...venue,
      activities: merged.slice(0, ACTIVITY_PEEK_PER_VENUE),
      eventCount: bucket.eventCount,
      tournamentCount: bucket.tournamentCount,
    };
  });
}

async function findWithinRadius(query: VenueFeedQuery, radiusKm: number): Promise<VenueCardData[]> {
  const box = boundingBox(query.lat, query.lng, radiusKm);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('venues')
    .select('id, name, description, address, city, sports, verified, amenities, opening_hours, latitude, longitude, cover_url, logo_url, website_url')
    .gte('latitude', box.minLat)
    .lte('latitude', box.maxLat)
    .gte('longitude', box.minLng)
    .lte('longitude', box.maxLng)
    .order('name', { ascending: true })
    .limit(50);

  if (error || !data) {
    if (error && process.env.NODE_ENV !== 'production') console.error('[venues.getNearbyVenuesFeed]', error.message);
    return [];
  }

  const search = query.search?.trim().toLowerCase();

  return (data as VenueRow[])
    .filter((venue) => venue.latitude !== null && venue.longitude !== null)
    .map((venue) => ({
      venue,
      distanceKm: distanceKm(query.lat, query.lng, venue.latitude as number, venue.longitude as number),
    }))
    .filter(({ distanceKm: d }) => d <= radiusKm)
    .filter(({ venue }) => matchesSport(venue.sports, query.sport))
    .filter(({ venue }) => {
      if (!search) return true;
      return (
        venue.name.toLowerCase().includes(search) ||
        venue.city.toLowerCase().includes(search) ||
        (venue.description?.toLowerCase().includes(search) ?? false) ||
        (venue.sports ?? []).some((sport) => sport.toLowerCase().includes(search))
      );
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .map(({ venue, distanceKm: d }) => mapVenueCard(venue, d));
}

/** Nearby venue feed with 20km → 50km fallback (unless radius overridden). */
export async function getNearbyVenuesFeed(query: VenueFeedQuery): Promise<VenueFeedResult> {
  const primaryRadius = query.radiusKm ?? DEFAULT_RADIUS_KM;
  const nearby = await findWithinRadius(query, primaryRadius);
  if (nearby.length > 0) {
    return {
      venues: await attachVenueActivities(nearby),
      radiusKm: primaryRadius,
      showExtended: false,
    };
  }

  if (query.allowExtended === false) {
    return {
      venues: [],
      radiusKm: primaryRadius,
      showExtended: false,
      message: 'Nothing in this area right now.',
    };
  }

  const extended = await findWithinRadius(query, EXTENDED_RADIUS_KM);
  return {
    venues: await attachVenueActivities(extended),
    radiusKm: EXTENDED_RADIUS_KM,
    showExtended: true,
    message: `Nothing nearby? Check out venues ${EXTENDED_RADIUS_KM}km away.`,
  };
}

/** City-first Bratislava venue discovery (no GPS required). */
export async function getCityVenuesFeed(query: {
  city?: string;
  lat?: number;
  lng?: number;
}): Promise<VenueFeedResult> {
  const city = query.city ?? 'Bratislava';
  const lat = query.lat ?? 48.1486;
  const lng = query.lng ?? 17.1077;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('venues')
    .select(
      'id, name, description, address, city, sports, verified, amenities, opening_hours, latitude, longitude, cover_url, logo_url, website_url',
    )
    .ilike('city', `%${city}%`)
    .order('name', { ascending: true })
    .limit(80);

  if (error || !data) {
    if (error && process.env.NODE_ENV !== 'production') {
      console.error('[venues.getCityVenuesFeed]', error.message);
    }
    return { venues: [], radiusKm: 0, showExtended: false, message: error?.message };
  }

  const venues = (data as VenueRow[]).map((venue) => {
    const d =
      venue.latitude != null && venue.longitude != null
        ? distanceKm(lat, lng, venue.latitude, venue.longitude)
        : 0;
    return mapVenueCard(venue, d);
  });

  return {
    venues: await attachVenueActivities(venues),
    radiusKm: 0,
    showExtended: false,
  };
}

/** Venues in a Bratislava borough — filters on persisted venues.district. */
export async function getDistrictVenuesFeed(query: {
  districtId: string;
  lat?: number;
  lng?: number;
}): Promise<VenueFeedResult> {
  const lat = query.lat ?? 48.1486;
  const lng = query.lng ?? 17.1077;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('venues')
    .select(
      'id, name, description, address, city, sports, verified, amenities, opening_hours, latitude, longitude, cover_url, logo_url, website_url, district',
    )
    .eq('district', query.districtId)
    .order('name', { ascending: true })
    .limit(80);

  if (error || !data) {
    if (error && process.env.NODE_ENV !== 'production') {
      console.error('[venues.getDistrictVenuesFeed]', error.message);
    }
    return { venues: [], radiusKm: 0, showExtended: false, message: error?.message };
  }

  const venues = (data as VenueRow[]).map((venue) => {
    const d =
      venue.latitude != null && venue.longitude != null
        ? distanceKm(lat, lng, venue.latitude, venue.longitude)
        : 0;
    return mapVenueCard(venue, d);
  });

  return {
    venues: await attachVenueActivities(venues),
    radiusKm: 0,
    showExtended: false,
  };
}

async function fetchUpcomingEvents(venueId: string): Promise<VenueEventPreview[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('events')
      .select('id, title, sport, starts_at, status')
      .eq('venue_id', venueId)
      .gte('starts_at', activeFeedSinceIso())
      .order('starts_at', { ascending: true })
      .limit(5);

    if (error || !data) {
    if (error && process.env.NODE_ENV !== 'production') console.error('[venues.getNearbyVenuesFeed]', error.message);
    return [];
  }

    return (data as EventPreviewRow[]).map((event) => ({
      id: event.id,
      title: event.title,
      sport: event.sport,
      startsAt: new Date(event.starts_at),
      status: event.status,
    }));
  } catch {
    return [];
  }
}

async function fetchUpcomingTournaments(venueId: string): Promise<VenueTournamentPreview[]> {
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('tournaments')
      .select('id, name, sport, starts_at, status')
      .eq('venue_id', venueId)
      .gte('starts_at', now)
      .order('starts_at', { ascending: true })
      .limit(5);

    if (error || !data) {
      if (error && process.env.NODE_ENV !== 'production') console.error('[venues.fetchUpcomingTournaments]', error.message);
      return [];
    }

    return (data as TournamentPreviewRow[]).map((tournament) => ({
      id: tournament.id,
      name: tournament.name,
      sport: tournament.sport,
      startsAt: new Date(tournament.starts_at),
      status: tournament.status,
    }));
  } catch {
    return [];
  }
}

async function fetchUpcomingLobbies(venueId: string): Promise<VenueLobbyPreview[]> {
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('lobbies')
      .select('id, sport, format, scheduled_at, status, spots_total, spots_filled')
      .eq('venue_id', venueId)
      .gte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(5);

    if (error || !data) {
    if (error && process.env.NODE_ENV !== 'production') console.error('[venues.getNearbyVenuesFeed]', error.message);
    return [];
  }

    return (data as LobbyPreviewRow[]).map((lobby) => ({
      id: lobby.id,
      sport: lobby.sport,
      format: lobby.format,
      scheduledAt: new Date(lobby.scheduled_at),
      status: lobby.status,
      spotsTotal: lobby.spots_total,
      spotsFilled: lobby.spots_filled,
    }));
  } catch {
    return [];
  }
}

export async function getVenueById(id: string): Promise<VenueDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('venues').select('*').eq('id', id).maybeSingle();

  if (error || !data) return null;

  const row = data as VenueRow & {
    owner_id: string | null;
    address: string | null;
    amenities: unknown;
    opening_hours: Record<string, unknown> | null;
  };

  const [upcomingEvents, upcomingTournaments, upcomingLobbies] = await Promise.all([
    fetchUpcomingEvents(id),
    fetchUpcomingTournaments(id),
    fetchUpcomingLobbies(id),
  ]);

  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description,
    address: row.address,
    city: row.city,
    sports: row.sports ?? [],
    verified: row.verified,
    amenities: parseAmenities(row.amenities),
    openingHours: parseOpeningHours(row.opening_hours),
    latitude: row.latitude,
    longitude: row.longitude,
    coverUrl: row.cover_url ?? null,
    logoUrl: row.logo_url ?? null,
    websiteUrl: row.website_url ?? null,
    upcomingEvents,
    upcomingTournaments,
    upcomingLobbies,
  };
}
