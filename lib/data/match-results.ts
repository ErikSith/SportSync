import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { fail, ok, type DataResult } from '@/lib/data/result';
import { emitDomainEvent } from '@/lib/orchestration/emit';
import { DOMAIN_EVENTS } from '@/lib/orchestration/types';
import type {
  MatchActivityCard,
  MatchActivityParticipant,
  MatchActivityResult,
} from '@/lib/data/profile-shared';

export type { MatchActivityCard, MatchActivityParticipant, MatchActivityResult };

export type MatchContextType = 'lobby' | 'tournament' | 'group_session' | 'lesson';

export interface MatchResultRecord {
  id: string;
  sport: string;
  contextType: MatchContextType;
  contextId: string;
  participantIds: string[];
  winnerId: string | null;
  score: Record<string, unknown>;
  status: string;
  createdAt: Date;
}

export interface RecordMatchInput {
  sport: string;
  contextType: MatchContextType;
  contextId: string;
  participantIds: string[];
  winnerId?: string | null;
  score?: Record<string, unknown>;
}

export async function recordMatchResult(
  input: RecordMatchInput,
  recordedById: string,
): Promise<DataResult<MatchResultRecord>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('match_results')
    .insert({
      sport: input.sport,
      context_type: input.contextType,
      context_id: input.contextId,
      participant_ids: input.participantIds,
      winner_id: input.winnerId ?? null,
      score: input.score ?? {},
      recorded_by_id: recordedById,
      status: 'confirmed',
    })
    .select('*')
    .single();

  if (error) {
    return fail(null as unknown as MatchResultRecord, `recordMatchResult: ${error.message}`);
  }

  const recorded = mapRow(data);

  await emitDomainEvent({
    name: DOMAIN_EVENTS.MATCH_RESULT_RECORDED,
    payload: {
      entityType: 'match',
      entityId: recorded.id,
      sport: recorded.sport,
      participantIds: recorded.participantIds,
      userId: recordedById,
      contextType: recorded.contextType,
      contextId: recorded.contextId,
      winnerId: recorded.winnerId,
    },
  });

  return ok(recorded);
}

export async function getMatchResultsForContext(
  contextType: MatchContextType,
  contextId: string,
): Promise<DataResult<MatchResultRecord[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('match_results')
    .select('*')
    .eq('context_type', contextType)
    .eq('context_id', contextId)
    .order('created_at', { ascending: false });

  if (error) return fail([], `getMatchResultsForContext: ${error.message}`);
  return ok((data ?? []).map(mapRow));
}

function scoreLabelFrom(score: Record<string, unknown>): string | null {
  if (typeof score.home === 'number' && typeof score.away === 'number') {
    return `${score.home} : ${score.away}`;
  }
  if (typeof score.a === 'number' && typeof score.b === 'number') {
    return `${score.a} : ${score.b}`;
  }
  if (typeof score.label === 'string' && score.label.trim()) return score.label.trim();
  if (typeof score.display === 'string' && score.display.trim()) return score.display.trim();
  return null;
}

function resultForUser(
  profileId: string,
  winnerId: string | null,
  score: Record<string, unknown>,
): MatchActivityResult {
  if (winnerId) {
    if (winnerId === profileId) return 'win';
    return 'loss';
  }
  if (score.draw === true || score.result === 'draw') return 'draw';
  return 'draw';
}

/** Recent confirmed matches for profile activity cards. */
export async function getUserMatchActivity(
  profileId: string,
  take = 8,
): Promise<MatchActivityCard[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('match_results')
    .select('*')
    .contains('participant_ids', [profileId])
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false })
    .limit(take);

  if (error || !data?.length) return [];

  const rows = data.map(mapRow);
  const lobbyIds = rows.filter((r) => r.contextType === 'lobby').map((r) => r.contextId);
  const tournamentIds = rows.filter((r) => r.contextType === 'tournament').map((r) => r.contextId);
  const activityIds = rows.filter((r) => r.contextType === 'group_session').map((r) => r.contextId);
  const allParticipantIds = [...new Set(rows.flatMap((r) => r.participantIds))];

  const [lobbiesRes, tournamentsRes, activitiesRes, profilesRes] = await Promise.all([
    lobbyIds.length
      ? supabase
          .from('lobbies')
          .select('id, sport, format, title, city, venues(name)')
          .in('id', lobbyIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    tournamentIds.length
      ? supabase.from('tournaments').select('id, name, city, venues(name)').in('id', tournamentIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    activityIds.length
      ? supabase
          .from('sport_group_activities')
          .select('id, title, location_note, destination_name')
          .in('id', activityIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    allParticipantIds.length
      ? supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', allParticipantIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  const lobbyMap = new Map((lobbiesRes.data ?? []).map((row) => [row.id as string, row]));
  const tournamentMap = new Map((tournamentsRes.data ?? []).map((row) => [row.id as string, row]));
  const activityMap = new Map((activitiesRes.data ?? []).map((row) => [row.id as string, row]));
  const profileMap = new Map(
    (profilesRes.data ?? []).map((row) => [
      row.id as string,
      {
        id: row.id as string,
        name: ((row.full_name as string | null) ?? (row.username as string)) as string,
        avatarUrl: (row.avatar_url as string | null) ?? null,
      } satisfies MatchActivityParticipant,
    ]),
  );

  function venueName(venues: unknown): string | null {
    if (!venues) return null;
    if (Array.isArray(venues)) return (venues[0]?.name as string | undefined) ?? null;
    return ((venues as { name?: string }).name) ?? null;
  }

  return rows.map((row) => {
    let title = `${row.sport} match`;
    let location: string | null = null;

    if (row.contextType === 'lobby') {
      const lobby = lobbyMap.get(row.contextId);
      if (lobby) {
        title =
          (lobby.title as string | null) ||
          `${(lobby.sport as string) ?? row.sport}${(lobby.format as string) ? ` · ${lobby.format}` : ''}`;
        location = venueName(lobby.venues) ?? (lobby.city as string | null) ?? null;
      }
    } else if (row.contextType === 'tournament') {
      const tournament = tournamentMap.get(row.contextId);
      if (tournament) {
        title = (tournament.name as string) ?? title;
        location = venueName(tournament.venues) ?? (tournament.city as string | null) ?? null;
      }
    } else if (row.contextType === 'group_session') {
      const activity = activityMap.get(row.contextId);
      if (activity) {
        title = (activity.title as string) ?? title;
        location =
          (activity.destination_name as string | null) ??
          (activity.location_note as string | null) ??
          null;
      }
    }

    return {
      id: row.id,
      sport: row.sport,
      contextType: row.contextType,
      title,
      location,
      result: resultForUser(profileId, row.winnerId, row.score),
      scoreLabel: scoreLabelFrom(row.score),
      createdAt: row.createdAt.toISOString(),
      participants: row.participantIds
        .map((id) => profileMap.get(id))
        .filter((p): p is MatchActivityParticipant => Boolean(p))
        .slice(0, 5),
    };
  });
}

function mapRow(row: Record<string, unknown>): MatchResultRecord {
  return {
    id: row.id as string,
    sport: row.sport as string,
    contextType: row.context_type as MatchContextType,
    contextId: row.context_id as string,
    participantIds: (row.participant_ids as string[]) ?? [],
    winnerId: (row.winner_id as string) ?? null,
    score: (row.score as Record<string, unknown>) ?? {},
    status: row.status as string,
    createdAt: new Date(row.created_at as string),
  };
}
