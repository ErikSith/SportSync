import { createClient } from '@/lib/supabase/server';

export interface FavoriteVenue {
  id: string;
  name: string;
  city: string;
  sports: string[];
  verified: boolean;
  visits: number;
  lastVisitedAt: Date | null;
  topSport: string | null;
}

interface LobbyVenueRow {
  id: string;
  venue_id: string | null;
  scheduled_at: string | null;
  sport: string | null;
}

interface VenueRow {
  id: string;
  name: string;
  city: string;
  sports: string[] | null;
  verified: boolean;
}

interface VenueAggregate {
  venueId: string;
  visits: number;
  lastVisitedAt: Date | null;
  sportCounts: Map<string, number>;
}

function topSportFromCounts(sportCounts: Map<string, number>): string | null {
  let topSport: string | null = null;
  let topCount = 0;
  for (const [sport, count] of sportCounts) {
    if (count > topCount) {
      topCount = count;
      topSport = sport;
    }
  }
  return topSport;
}

/**
 * Computes the profile's most-visited venues by aggregating the lobbies they
 * hosted and joined. Read-only over existing tables; any Supabase error returns
 * an empty list to stay resilient like the rest of the data layer.
 */
export async function getFavoriteVenues(profileId: string, take = 4): Promise<FavoriteVenue[]> {
  const supabase = await createClient();

  const [hostedRes, joinedRes] = await Promise.all([
    supabase.from('lobbies').select('id').eq('host_id', profileId),
    supabase.from('lobby_participants').select('lobby_id').eq('user_id', profileId),
  ]);

  if (hostedRes.error || joinedRes.error) return [];

  const lobbyIds = [
    ...new Set([
      ...(hostedRes.data ?? []).map((row) => row.id as string),
      ...(joinedRes.data ?? []).map((row) => row.lobby_id as string),
    ]),
  ].filter(Boolean);

  if (lobbyIds.length === 0) return [];

  const { data: lobbyRows, error: lobbyError } = await supabase
    .from('lobbies')
    .select('id, venue_id, scheduled_at, sport')
    .in('id', lobbyIds);

  if (lobbyError || !lobbyRows) return [];

  const aggregates = new Map<string, VenueAggregate>();

  for (const lobby of lobbyRows as LobbyVenueRow[]) {
    if (!lobby.venue_id) continue;

    const existing = aggregates.get(lobby.venue_id) ?? {
      venueId: lobby.venue_id,
      visits: 0,
      lastVisitedAt: null,
      sportCounts: new Map<string, number>(),
    };

    existing.visits += 1;

    if (lobby.scheduled_at) {
      const visitedAt = new Date(lobby.scheduled_at);
      if (!Number.isNaN(visitedAt.getTime()) && (!existing.lastVisitedAt || visitedAt > existing.lastVisitedAt)) {
        existing.lastVisitedAt = visitedAt;
      }
    }

    if (lobby.sport) {
      existing.sportCounts.set(lobby.sport, (existing.sportCounts.get(lobby.sport) ?? 0) + 1);
    }

    aggregates.set(lobby.venue_id, existing);
  }

  if (aggregates.size === 0) return [];

  const ranked = [...aggregates.values()].sort((a, b) => {
    if (b.visits !== a.visits) return b.visits - a.visits;
    const aTime = a.lastVisitedAt?.getTime() ?? 0;
    const bTime = b.lastVisitedAt?.getTime() ?? 0;
    return bTime - aTime;
  });

  const topVenueIds = ranked.slice(0, take).map((entry) => entry.venueId);

  const { data: venueRows, error: venueError } = await supabase
    .from('venues')
    .select('id, name, city, sports, verified')
    .in('id', topVenueIds);

  if (venueError || !venueRows) return [];

  const venuesById = new Map<string, VenueRow>();
  for (const venue of venueRows as VenueRow[]) {
    venuesById.set(venue.id, venue);
  }

  return topVenueIds
    .map((venueId) => {
      const venue = venuesById.get(venueId);
      const aggregate = aggregates.get(venueId);
      if (!venue || !aggregate) return null;

      return {
        id: venue.id,
        name: venue.name,
        city: venue.city,
        sports: venue.sports ?? [],
        verified: venue.verified,
        visits: aggregate.visits,
        lastVisitedAt: aggregate.lastVisitedAt,
        topSport: topSportFromCounts(aggregate.sportCounts),
      } satisfies FavoriteVenue;
    })
    .filter((venue): venue is FavoriteVenue => venue !== null);
}
