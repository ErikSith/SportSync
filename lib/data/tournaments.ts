import { createClient } from '@/lib/supabase/server';
import { parseDbInstant } from '@/lib/datetime/bratislava';
import { activeFeedSinceIso } from '@/lib/retention/feed-window';

export interface TournamentCardData {
  id: string;
  name: string;
  description: string | null;
  sport: string;
  format: string;
  status: string;
  entryFee: number;
  currentParticipants: number;
  maxParticipants: number;
  coverUrl: string | null;
  startsAt: Date;
  endsAt: Date | null;
  registrationDeadline: Date | null;
  venueId: string | null;
  venueName: string | null;
  venueCity: string | null;
  venueAddress: string | null;
  venueLatitude: number | null;
  venueLongitude: number | null;
  skillLevelMin: number | null;
  skillLevelMax: number | null;
  /** Scrape adapter id when aggregated from an external organizer. */
  source: string | null;
  sourceUrl: string | null;
  ticketUrl: string | null;
  isAggregated: boolean;
}

export interface TournamentDetailData extends TournamentCardData {
  organizerName: string;
  confirmedCount: number;
  isRegistered: boolean;
  registrationStatus: string | null;
}

interface VenueSnippet {
  name: string;
  city: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface OrganizerSnippet {
  full_name: string | null;
  username: string;
}

interface RegistrationSnippet {
  id: string;
  user_id: string;
  status: string;
}

interface TournamentRow {
  id: string;
  name: string;
  description: string | null;
  sport: string;
  format: string;
  status: string;
  entry_fee: number | string;
  current_participants: number;
  max_participants: number;
  cover_url: string | null;
  starts_at: string;
  ends_at: string | null;
  registration_deadline: string | null;
  skill_level_min: number | null;
  skill_level_max: number | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  venue_id: string | null;
  source?: string | null;
  source_url?: string | null;
  ticket_url?: string | null;
  venues: VenueSnippet | VenueSnippet[] | null;
  profiles?: OrganizerSnippet | OrganizerSnippet[] | null;
  tournament_registrations?: RegistrationSnippet[];
}

function resolveVenue(venues: TournamentRow['venues']): VenueSnippet | null {
  if (!venues) return null;
  return Array.isArray(venues) ? (venues[0] ?? null) : venues;
}

function resolveOrganizer(profiles: TournamentRow['profiles']): OrganizerSnippet | null {
  if (!profiles) return null;
  return Array.isArray(profiles) ? (profiles[0] ?? null) : profiles;
}

function isUpcomingTournamentRow(row: TournamentRow, now = new Date()): boolean {
  const starts = parseDbInstant(row.starts_at).getTime();
  const ends = row.ends_at ? parseDbInstant(row.ends_at).getTime() : null;
  const grace = now.getTime() - 2 * 60 * 60 * 1000;
  return starts >= grace || (ends != null && ends >= now.getTime());
}

function mapTournamentRow(row: TournamentRow): TournamentCardData {
  const venue = resolveVenue(row.venues);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sport: row.sport,
    format: row.format,
    status: row.status,
    entryFee: Number(row.entry_fee),
    currentParticipants: row.current_participants,
    maxParticipants: row.max_participants,
    coverUrl: row.cover_url,
    startsAt: parseDbInstant(row.starts_at),
    endsAt: row.ends_at ? parseDbInstant(row.ends_at) : null,
    registrationDeadline: row.registration_deadline
      ? parseDbInstant(row.registration_deadline)
      : null,
    venueId: row.venue_id,
    venueName: venue?.name ?? null,
    venueCity: venue?.city ?? row.city ?? null,
    venueAddress: venue?.address ?? null,
    venueLatitude: venue?.latitude ?? row.latitude ?? null,
    venueLongitude: venue?.longitude ?? row.longitude ?? null,
    skillLevelMin: row.skill_level_min,
    skillLevelMax: row.skill_level_max,
    source: row.source ?? null,
    sourceUrl: row.source_url ?? null,
    ticketUrl: row.ticket_url ?? null,
    isAggregated: Boolean(row.source),
  };
}

/** Upcoming tournaments (registration open or in progress), optional sport/search filters. */
export async function getUpcomingTournaments(query: {
  sport?: string;
  search?: string;
}): Promise<TournamentCardData[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const graceIso = activeFeedSinceIso();

  let request = supabase
    .from('tournaments')
    .select('*, venues(name, city, address, latitude, longitude)')
    .in('status', ['REGISTRATION_OPEN', 'IN_PROGRESS'])
    .or(`starts_at.gte."${graceIso}",ends_at.gte."${nowIso}"`)
    .order('starts_at', { ascending: true })
    .limit(50);

  if (query.sport && query.sport !== 'ALL') {
    request = request.ilike('sport', query.sport);
  }

  const { data, error } = await request;
  if (error || !data) {
    if (error && process.env.NODE_ENV !== 'production') console.error('[tournaments.getUpcomingTournaments]', error.message);
    return [];
  }

  const search = query.search?.trim().toLowerCase();

  return (data as TournamentRow[])
    .filter((row) => {
      if (!isUpcomingTournamentRow(row)) return false;
      if (!search) return true;
      const venue = resolveVenue(row.venues);
      return (
        row.name.toLowerCase().includes(search) ||
        row.sport.toLowerCase().includes(search) ||
        row.format.toLowerCase().includes(search) ||
        (venue?.name?.toLowerCase().includes(search) ?? false) ||
        (venue?.city?.toLowerCase().includes(search) ?? false) ||
        (row.city?.toLowerCase().includes(search) ?? false)
      );
    })
    .map(mapTournamentRow);
}

/** Upcoming tournaments hosted at specific venues — for homepage "Home Turf". */
export async function getUpcomingTournamentsAtVenues(
  venueIds: string[],
  take = 5,
): Promise<TournamentCardData[]> {
  if (venueIds.length === 0) return [];

  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const graceIso = activeFeedSinceIso();
  const { data, error } = await supabase
    .from('tournaments')
    .select('*, venues(name, city, address, latitude, longitude)')
    .in('venue_id', venueIds)
    .in('status', ['REGISTRATION_OPEN', 'IN_PROGRESS'])
    .or(`starts_at.gte."${graceIso}",ends_at.gte."${nowIso}"`)
    .order('starts_at', { ascending: true })
    .limit(take);

  if (error || !data) {
    if (error && process.env.NODE_ENV !== 'production') {
      console.error('[tournaments.getUpcomingTournamentsAtVenues]', error.message);
    }
    return [];
  }

  return (data as TournamentRow[])
    .filter((row) => isUpcomingTournamentRow(row))
    .map(mapTournamentRow);
}

/** Full tournament detail with venue, organizer, registration state, and confirmed count. */
export async function getTournamentById(
  id: string,
  profileId?: string,
): Promise<TournamentDetailData | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tournaments')
    .select(
      `
      *,
      venues ( name, city, address, latitude, longitude ),
      profiles!tournaments_organizer_id_fkey ( full_name, username ),
      tournament_registrations ( id, user_id, status )
    `,
    )
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as TournamentRow;
  const organizer = resolveOrganizer(row.profiles);
  const registrations = row.tournament_registrations ?? [];
  const confirmedCount = registrations.filter((r) => r.status === 'CONFIRMED').length;
  const userRegistration = profileId ? registrations.find((r) => r.user_id === profileId) : undefined;

  return {
    ...mapTournamentRow(row),
    organizerName: organizer?.full_name ?? organizer?.username ?? resolveVenue(row.venues)?.name ?? 'Official',
    confirmedCount,
    isRegistered: userRegistration !== undefined && userRegistration.status !== 'CANCELLED',
    registrationStatus: userRegistration?.status ?? null,
  };
}
