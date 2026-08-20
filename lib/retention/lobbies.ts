import { createAdminClient } from '@/lib/supabase/admin';
import { hasValidServiceRoleKey } from '@/lib/db/service-role';

/** Keep community lobbies this many minutes after `scheduled_at`, then hard-delete. */
export const LOBBY_RETENTION_MINUTES = 20;

const DELETE_BATCH_SIZE = 200;

export interface CleanupExpiredLobbiesResult {
  deleted: number;
  threshold: string;
  retentionPeriodMinutes: number;
}

/** Lower bound for lobby feed queries — still list matches during the post-start grace. */
export function lobbyActiveSince(now = new Date()): Date {
  return new Date(now.getTime() - LOBBY_RETENTION_MINUTES * 60 * 1000);
}

export function lobbyActiveSinceIso(now = new Date()): string {
  return lobbyActiveSince(now).toISOString();
}

async function detachActivityLinks(supabase: ReturnType<typeof createAdminClient>, ids: string[]) {
  // Soft FK from crew sessions — clear before delete so we do not fail on restrict.
  await supabase.from('sport_group_activities').update({ mercenary_lobby_id: null }).in('mercenary_lobby_id', ids);
  await supabase.from('sport_group_activities').update({ lobby_id: null }).in('lobby_id', ids);
}

async function deleteExpiredBatchSupabase(thresholdIso: string): Promise<number> {
  const supabase = createAdminClient();
  let deleted = 0;

  for (;;) {
    const { data: batch, error: selectError } = await supabase
      .from('lobbies')
      .select('id')
      .lt('scheduled_at', thresholdIso)
      .limit(DELETE_BATCH_SIZE);

    if (selectError) {
      throw new Error(`[LobbyRetention] select failed: ${selectError.message}`);
    }

    const ids = (batch ?? []).map((row) => row.id as string);
    if (ids.length === 0) break;

    await detachActivityLinks(supabase, ids);

    const { error: deleteError } = await supabase.from('lobbies').delete().in('id', ids);
    if (deleteError) {
      throw new Error(`[LobbyRetention] delete failed: ${deleteError.message}`);
    }

    deleted += ids.length;
    if (ids.length < DELETE_BATCH_SIZE) break;
  }

  return deleted;
}

async function deleteExpiredViaPg(thresholdIso: string): Promise<number> {
  const { pgQuery } = await import('@/lib/db/pg');

  await pgQuery(
    `update sport_group_activities
     set mercenary_lobby_id = null
     where mercenary_lobby_id in (
       select id from lobbies where scheduled_at < $1::timestamptz
     )`,
    [thresholdIso],
  );

  await pgQuery(
    `update sport_group_activities
     set lobby_id = null
     where lobby_id in (
       select id from lobbies where scheduled_at < $1::timestamptz
     )`,
    [thresholdIso],
  );

  const result = await pgQuery<{ n: number }>(
    `with doomed as (
       select id from lobbies
       where scheduled_at < $1::timestamptz
       limit $2
     ),
     deleted as (
       delete from lobbies l using doomed d where l.id = d.id
       returning l.id
     )
     select count(*)::int as n from deleted`,
    [thresholdIso, DELETE_BATCH_SIZE * 50],
  );

  return result.rows[0]?.n ?? 0;
}

/**
 * Hard-delete community lobbies whose play time + grace window has passed.
 * Participants cascade via DB FK; activity mercenary/lobby links are nulled first.
 */
export async function cleanupExpiredLobbies(
  retentionPeriodMinutes: number = LOBBY_RETENTION_MINUTES,
): Promise<CleanupExpiredLobbiesResult> {
  const expirationThreshold = new Date(Date.now() - retentionPeriodMinutes * 60 * 1000);
  const thresholdIso = expirationThreshold.toISOString();

  let deleted = 0;

  if (hasValidServiceRoleKey()) {
    deleted = await deleteExpiredBatchSupabase(thresholdIso);
  } else {
    console.warn(
      '[LobbyRetention] SUPABASE_SERVICE_ROLE_KEY missing/placeholder — using DATABASE_URL (pooler).',
    );
    deleted = await deleteExpiredViaPg(thresholdIso);
  }

  console.log(`[LobbyRetention] Deleted ${deleted} lobbies (scheduled_at < ${thresholdIso}).`);

  return {
    deleted,
    threshold: thresholdIso,
    retentionPeriodMinutes,
  };
}
