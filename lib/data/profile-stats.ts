import { createClient } from '@/lib/supabase/server';

export interface ProfileGameStats {
  lobbiesHosted: number;
  lobbiesJoined: number;
  completedLobbies: number;
  tournamentRegistrations: number;
  lessonsBooked: number;
}

export interface KarmaHistoryEntry {
  id: string;
  type: string;
  delta: number;
  contextRef: string | null;
  createdAt: Date;
  actorId: string | null;
  actorName: string | null;
}

interface ActorRow {
  full_name: string | null;
  username: string;
}

interface KarmaEventRow {
  id: string;
  type: string;
  delta: number | string;
  context_ref: string | null;
  created_at: string;
  actor_id: string | null;
  profiles: ActorRow | ActorRow[] | null;
}

export { profileTierLabel } from '@/lib/utils/profile-tier';

function actorNameFromRow(profiles: KarmaEventRow['profiles']): string | null {
  if (!profiles) return null;
  const row = Array.isArray(profiles) ? profiles[0] : profiles;
  if (!row) return null;
  return row.full_name ?? row.username;
}

/** Lobby, tournament, and lesson counts for the signed-in profile. */
export async function getProfileGameStats(profileId: string): Promise<ProfileGameStats> {
  const empty: ProfileGameStats = {
    lobbiesHosted: 0,
    lobbiesJoined: 0,
    completedLobbies: 0,
    tournamentRegistrations: 0,
    lessonsBooked: 0,
  };

  const supabase = await createClient();

  const [hostedRes, joinedRes, tournamentRes, lessonsRes] = await Promise.all([
    supabase.from('lobbies').select('*', { count: 'exact', head: true }).eq('host_id', profileId),
    supabase.from('lobby_participants').select('*', { count: 'exact', head: true }).eq('user_id', profileId),
    supabase.from('tournament_registrations').select('*', { count: 'exact', head: true }).eq('user_id', profileId),
    supabase.from('training_lesson_bookings').select('*', { count: 'exact', head: true }).eq('user_id', profileId),
  ]);

  const lobbiesHosted = hostedRes.error ? 0 : (hostedRes.count ?? 0);
  const lobbiesJoined = joinedRes.error ? 0 : (joinedRes.count ?? 0);
  const tournamentRegistrations = tournamentRes.error ? 0 : (tournamentRes.count ?? 0);
  const lessonsBooked = lessonsRes.error ? 0 : (lessonsRes.count ?? 0);

  const { data: memberships, error: membershipError } = await supabase
    .from('lobby_participants')
    .select('lobby_id')
    .eq('user_id', profileId);

  const { data: hostedRows, error: hostedListError } = await supabase
    .from('lobbies')
    .select('id')
    .eq('host_id', profileId);

  let completedLobbies = 0;
  if (!membershipError && !hostedListError) {
    const lobbyIds = [
      ...new Set([
        ...(memberships ?? []).map((row) => row.lobby_id as string),
        ...(hostedRows ?? []).map((row) => row.id as string),
      ]),
    ];

    if (lobbyIds.length > 0) {
      const { count, error: completedError } = await supabase
        .from('lobbies')
        .select('*', { count: 'exact', head: true })
        .in('id', lobbyIds)
        .eq('status', 'completed');

      completedLobbies = completedError ? 0 : (count ?? 0);
    }
  }

  if (hostedRes.error || joinedRes.error || tournamentRes.error || lessonsRes.error) {
    return { ...empty, lobbiesHosted, lobbiesJoined, completedLobbies, tournamentRegistrations, lessonsBooked };
  }

  return { lobbiesHosted, lobbiesJoined, completedLobbies, tournamentRegistrations, lessonsBooked };
}

/** Recent karma ledger entries for the profile activity feed. */
export async function getKarmaHistory(profileId: string, take = 10): Promise<KarmaHistoryEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('karma_events')
    .select('id, type, delta, context_ref, created_at, actor_id, profiles!karma_events_actor_id_fkey(full_name, username)')
    .eq('subject_id', profileId)
    .order('created_at', { ascending: false })
    .limit(take);

  if (error || !data) {
    const { data: fallback, error: fallbackError } = await supabase
      .from('karma_events')
      .select('id, type, delta, context_ref, created_at, actor_id')
      .eq('subject_id', profileId)
      .order('created_at', { ascending: false })
      .limit(take);

    if (fallbackError || !fallback) return [];

    const actorIds = [...new Set(fallback.map((row) => row.actor_id as string | null).filter(Boolean))] as string[];
    const actorNames = new Map<string, string>();

    if (actorIds.length > 0) {
      const { data: actors } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', actorIds);

      for (const actor of actors ?? []) {
        actorNames.set(actor.id as string, (actor.full_name as string | null) ?? (actor.username as string));
      }
    }

    return fallback.map((row) => ({
      id: row.id as string,
      type: row.type as string,
      delta: Number(row.delta ?? 0),
      contextRef: row.context_ref as string | null,
      createdAt: new Date(row.created_at as string),
      actorId: row.actor_id as string | null,
      actorName: row.actor_id ? (actorNames.get(row.actor_id as string) ?? null) : null,
    }));
  }

  return (data as KarmaEventRow[]).map((row) => ({
    id: row.id,
    type: row.type,
    delta: Number(row.delta ?? 0),
    contextRef: row.context_ref,
    createdAt: new Date(row.created_at),
    actorId: row.actor_id,
    actorName: actorNameFromRow(row.profiles),
  }));
}
