import { createClient } from '@/lib/supabase/server';
import { boundingBox, distanceKm, DEFAULT_RADIUS_KM, EXTENDED_RADIUS_KM } from '@/lib/geo';

export { LOBBY_SPORTS, type LobbySport } from '@/lib/constants/sports';

export interface LobbyParticipantPreview {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export type LobbyTypeCode = 'NEED_PLAYER' | 'TEAM_CHALLENGE' | 'RECURRING';

export interface LobbyCardData {
  id: string;
  sport: string;
  format: string;
  title: string | null;
  lobbyType: LobbyTypeCode | null;
  city: string;
  scheduledAt: Date;
  spotsTotal: number;
  spotsFilled: number;
  status: string;
  splitPay: boolean;
  costPerPlayer: number;
  mercenaryMode: boolean;
  skillLevel: number | null;
  coverUrl: string | null;
  has3dEffect: boolean;
  hostName: string;
  venueId: string | null;
  venueName: string | null;
  distanceKm: number;
  participants: LobbyParticipantPreview[];
  isJoined: boolean;
  isHost: boolean;
}

export interface LobbyFeedResult {
  lobbies: LobbyCardData[];
  radiusKm: number;
  showExtended: boolean;
  message?: string;
}

interface LobbyFeedQuery {
  lat: number;
  lng: number;
  profileId: string;
  sport?: string;
  search?: string;
}

interface ProfileSnippet {
  id: string;
  full_name: string | null;
  username: string;
  avatar_url: string | null;
}

interface LobbyRow {
  id: string;
  sport: string;
  format: string;
  title?: string | null;
  lobby_type?: string | null;
  city: string;
  scheduled_at: string;
  spots_total: number;
  spots_filled: number;
  status: string;
  split_pay: boolean;
  cost_per_player: number | string;
  mercenary_mode: boolean;
  skill_level: number | null;
  cover_url?: string | null;
  has_3d_effect?: boolean | null;
  host_id: string;
  venue_id: string | null;
  latitude: number | null;
  longitude: number | null;
  profiles: ProfileSnippet | ProfileSnippet[] | null;
  venues: { name: string } | { name: string }[] | null;
  lobby_participants: Array<{
    user_id: string;
    profiles: ProfileSnippet | null;
  }>;
}

function resolveLobbyType(
  lobbyType: string | null,
  mercenaryMode: boolean,
  format: string,
): LobbyTypeCode | null {
  if (lobbyType === 'NEED_PLAYER' || lobbyType === 'TEAM_CHALLENGE' || lobbyType === 'RECURRING') {
    return lobbyType;
  }
  if (mercenaryMode) return 'NEED_PLAYER';
  const fmt = format.toLowerCase();
  if (fmt.includes('team') || fmt.includes('vs')) return 'TEAM_CHALLENGE';
  if (fmt.includes('recurring') || fmt.includes('weekly')) return 'RECURRING';
  return null;
}

function resolveTier(skillLevel: number | null): string {
  if (skillLevel === null) return 'CHALLENGER';
  if (skillLevel >= 1600) return 'ELITE TIER';
  if (skillLevel >= 1400) return 'MASTER TIER';
  return 'CHALLENGER';
}

// Kept for server-side use; client components should import from lib/utils/lobby.
export { resolveTier as lobbyTierLabel };

const LOBBY_CARD_SELECT = `
  *,
  profiles!lobbies_host_id_fkey ( id, full_name, username, avatar_url ),
  venues ( name ),
  lobby_participants (
    user_id,
    profiles ( id, full_name, username, avatar_url )
  )
`;

function mapLobbyRowToCard(
  lobby: LobbyRow,
  profileId: string,
  origin?: { lat: number; lng: number },
): LobbyCardData {
  const host = Array.isArray(lobby.profiles) ? lobby.profiles[0] : lobby.profiles;
  const venue = Array.isArray(lobby.venues) ? lobby.venues[0] : lobby.venues;
  const distance =
    origin && lobby.latitude !== null && lobby.longitude !== null
      ? Math.round(distanceKm(origin.lat, origin.lng, lobby.latitude, lobby.longitude) * 10) / 10
      : 0;

  return {
    id: lobby.id,
    sport: lobby.sport,
    format: lobby.format,
    title: lobby.title ?? null,
    lobbyType: resolveLobbyType(lobby.lobby_type ?? null, lobby.mercenary_mode, lobby.format),
    city: lobby.city,
    scheduledAt: new Date(lobby.scheduled_at),
    spotsTotal: lobby.spots_total,
    spotsFilled: lobby.spots_filled,
    status: lobby.status,
    splitPay: lobby.split_pay,
    costPerPlayer: Number(lobby.cost_per_player),
    mercenaryMode: lobby.mercenary_mode,
    skillLevel: lobby.skill_level,
    coverUrl: lobby.cover_url ?? null,
    has3dEffect: lobby.has_3d_effect ?? true,
    hostName: host?.full_name ?? host?.username ?? 'Unknown',
    venueId: lobby.venue_id ?? null,
    venueName: venue?.name ?? null,
    distanceKm: distance,
    participants: (lobby.lobby_participants ?? []).map((p) => {
      const user = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
      return {
        id: user?.id ?? p.user_id,
        name: user?.full_name ?? user?.username ?? 'Player',
        avatarUrl: user?.avatar_url ?? null,
      };
    }),
    isJoined: (lobby.lobby_participants ?? []).some((p) => p.user_id === profileId),
    isHost: lobby.host_id === profileId,
  };
}

/** Hosted or joined community matches — always shown regardless of distance/filters. */
export async function getMyLobbyCards(
  profileId: string,
  origin?: { lat: number; lng: number },
  take = 12,
): Promise<LobbyCardData[]> {
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
    .select(LOBBY_CARD_SELECT)
    .in('status', ['open', 'full', 'live'])
    .gte('scheduled_at', now)
    .or(orParts.join(','))
    .order('scheduled_at', { ascending: true })
    .limit(take);

  if (error || !data) {
    if (error && process.env.NODE_ENV !== 'production') console.error('[lobbies.getMyLobbyCards]', error.message);
    return [];
  }

  return (data as LobbyRow[]).map((lobby) => mapLobbyRowToCard(lobby, profileId, origin));
}

async function findWithinRadius(query: LobbyFeedQuery, radiusKm: number): Promise<LobbyCardData[]> {
  const box = boundingBox(query.lat, query.lng, radiusKm);
  const supabase = await createClient();

  let request = supabase
    .from('lobbies')
    .select(LOBBY_CARD_SELECT)
    .in('status', ['open', 'full', 'live'])
    .gte('scheduled_at', new Date().toISOString())
    .gte('latitude', box.minLat)
    .lte('latitude', box.maxLat)
    .gte('longitude', box.minLng)
    .lte('longitude', box.maxLng)
    .order('scheduled_at', { ascending: true })
    .limit(50);

  if (query.sport && query.sport !== 'ALL') {
    request = request.ilike('sport', query.sport);
  }

  const { data, error } = await request;
  if (error || !data) {
    if (error && process.env.NODE_ENV !== 'production') console.error('[lobbies.getNearbyLobbyFeed]', error.message);
    return [];
  }

  return (data as LobbyRow[])
    .filter((lobby) => lobby.latitude !== null && lobby.longitude !== null)
    .map((lobby) => ({
      lobby,
      distanceKm: distanceKm(query.lat, query.lng, lobby.latitude as number, lobby.longitude as number),
    }))
    .filter(({ distanceKm: d }) => d <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .map(({ lobby }) => mapLobbyRowToCard(lobby, query.profileId, { lat: query.lat, lng: query.lng }));
}

export async function getNearbyLobbyFeed(query: LobbyFeedQuery): Promise<LobbyFeedResult> {
  const nearby = await findWithinRadius(query, DEFAULT_RADIUS_KM);
  if (nearby.length > 0) {
    return { lobbies: nearby, radiusKm: DEFAULT_RADIUS_KM, showExtended: false };
  }

  const extended = await findWithinRadius(query, EXTENDED_RADIUS_KM);
  return {
    lobbies: extended,
    radiusKm: EXTENDED_RADIUS_KM,
    showExtended: true,
    message: `Nothing nearby? Check out matches ${EXTENDED_RADIUS_KM}km away.`,
  };
}

/** City-scoped open lobbies when GPS is unavailable. */
export async function getCityLobbyFeed(
  city: string,
  profileId: string,
  take = 24,
): Promise<LobbyCardData[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lobbies')
    .select(LOBBY_CARD_SELECT)
    .in('status', ['open', 'full', 'live'])
    .gte('scheduled_at', new Date().toISOString())
    .ilike('city', city)
    .order('scheduled_at', { ascending: true })
    .limit(take);

  if (error || !data) {
    if (error && process.env.NODE_ENV !== 'production') console.error('[lobbies.getCityLobbyFeed]', error.message);
    return [];
  }

  return (data as LobbyRow[]).map((lobby) => mapLobbyRowToCard(lobby, profileId));
}

export interface LobbyHostProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
  karmaScore: number;
}

export interface LobbyVenueInfo {
  id: string;
  name: string;
  address: string | null;
  city: string;
}

export interface LobbyRosterParticipant {
  id: string;
  name: string;
  avatarUrl: string | null;
  karmaScore: number;
  joinedAt: Date;
  isHost: boolean;
}

export interface LobbyDetailData {
  id: string;
  sport: string;
  format: string;
  city: string;
  scheduledAt: Date;
  spotsTotal: number;
  spotsFilled: number;
  status: string;
  splitPay: boolean;
  costPerPlayer: number;
  mercenaryMode: boolean;
  skillLevel: number | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
  host: LobbyHostProfile;
  venue: LobbyVenueInfo | null;
  participants: LobbyRosterParticipant[];
  isJoined: boolean;
  isHost: boolean;
}

interface LobbyDetailRow {
  id: string;
  sport: string;
  format: string;
  city: string;
  scheduled_at: string;
  spots_total: number;
  spots_filled: number;
  status: string;
  split_pay: boolean;
  cost_per_player: number | string;
  mercenary_mode: boolean;
  skill_level: number | null;
  host_id: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  profiles: ProfileSnippet & { karma_score?: number | string | null } | Array<ProfileSnippet & { karma_score?: number | string | null }> | null;
  venues:
    | { id: string; name: string; address: string | null; city: string }
    | Array<{ id: string; name: string; address: string | null; city: string }>
    | null;
  lobby_participants: Array<{
    user_id: string;
    joined_at: string;
    profiles: (ProfileSnippet & { karma_score?: number | string | null }) | null;
  }>;
}

export async function getLobbyById(id: string, viewerProfileId: string): Promise<LobbyDetailData | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('lobbies')
    .select(
      `
      *,
      profiles!lobbies_host_id_fkey ( id, full_name, username, avatar_url, karma_score ),
      venues ( id, name, address, city ),
      lobby_participants (
        user_id,
        joined_at,
        profiles ( id, full_name, username, avatar_url, karma_score )
      )
    `,
    )
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;

  const lobby = data as LobbyDetailRow;
  const hostRaw = lobby.profiles;
  const hostProfile = Array.isArray(hostRaw) ? hostRaw[0] : hostRaw;

  const venueRaw = lobby.venues;
  const venueRow = Array.isArray(venueRaw) ? venueRaw[0] : venueRaw;

  const participants: LobbyRosterParticipant[] = (lobby.lobby_participants ?? [])
    .map((p) => {
      const user = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
      return {
        id: user?.id ?? p.user_id,
        name: user?.full_name ?? user?.username ?? 'Player',
        avatarUrl: user?.avatar_url ?? null,
        karmaScore: Number(user?.karma_score ?? 0),
        joinedAt: new Date(p.joined_at),
        isHost: p.user_id === lobby.host_id,
      };
    })
    .sort((a, b) => {
      if (a.isHost !== b.isHost) return a.isHost ? -1 : 1;
      return a.joinedAt.getTime() - b.joinedAt.getTime();
    });

  return {
    id: lobby.id,
    sport: lobby.sport,
    format: lobby.format,
    city: lobby.city,
    scheduledAt: new Date(lobby.scheduled_at),
    spotsTotal: lobby.spots_total,
    spotsFilled: lobby.spots_filled,
    status: lobby.status,
    splitPay: lobby.split_pay,
    costPerPlayer: Number(lobby.cost_per_player),
    mercenaryMode: lobby.mercenary_mode,
    skillLevel: lobby.skill_level,
    latitude: lobby.latitude,
    longitude: lobby.longitude,
    createdAt: new Date(lobby.created_at),
    host: {
      id: hostProfile?.id ?? lobby.host_id,
      name: hostProfile?.full_name ?? hostProfile?.username ?? 'Host',
      avatarUrl: hostProfile?.avatar_url ?? null,
      karmaScore: Number(hostProfile?.karma_score ?? 0),
    },
    venue: venueRow
      ? {
          id: venueRow.id,
          name: venueRow.name,
          address: venueRow.address,
          city: venueRow.city,
        }
      : null,
    participants,
    isJoined: participants.some((p) => p.id === viewerProfileId),
    isHost: lobby.host_id === viewerProfileId,
  };
}
