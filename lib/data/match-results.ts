import { createClient } from '@/lib/supabase/server';
import { fail, ok, type DataResult } from '@/lib/data/result';
import { emitDomainEvent } from '@/lib/orchestration/emit';
import { DOMAIN_EVENTS } from '@/lib/orchestration/types';

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
