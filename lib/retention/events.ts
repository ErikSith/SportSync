import { createAdminClient } from '@/lib/supabase/admin';
import { hasValidServiceRoleKey, pgQuery } from '@/lib/db/pg';

/** How long after `starts_at` an event still appears in discovery feeds. */
export const FEED_ACTIVE_GRACE_HOURS = 2;

/** Hard-delete scraped events this many hours after `starts_at`. */
export const SCRAPED_EVENT_RETENTION_HOURS = 48;

const DELETE_BATCH_SIZE = 200;

/** Lower bound for feed queries: `starts_at >= NOW() - 2 hours`. */
export function activeFeedSince(now = new Date()): Date {
  return new Date(now.getTime() - FEED_ACTIVE_GRACE_HOURS * 60 * 60 * 1000);
}

export function activeFeedSinceIso(now = new Date()): string {
  return activeFeedSince(now).toISOString();
}

/**
 * Floor for feed `starts_at` filters.
 * When a date window is active, never go earlier than the grace floor
 * (keeps recently started events visible during "today").
 */
export function feedStartsAtFloor(windowFrom?: Date | null, now = new Date()): string {
  const grace = activeFeedSince(now);
  if (!windowFrom) return grace.toISOString();
  return (windowFrom > grace ? windowFrom : grace).toISOString();
}

export interface CleanupExpiredEventsResult {
  deleted: number;
  deletedEvents: number;
  deletedTournaments: number;
  threshold: string;
  retentionPeriodHours: number;
}

async function deleteExpiredBatchSupabase(
  table: 'events' | 'tournaments',
  thresholdIso: string,
): Promise<number> {
  const supabase = createAdminClient();
  let deleted = 0;

  for (;;) {
    let query = supabase.from(table).select('id').lt('starts_at', thresholdIso).limit(DELETE_BATCH_SIZE);

    if (table === 'events') {
      query = query.eq('is_aggregated', true);
    } else {
      query = query.not('source', 'is', null);
    }

    const { data: batch, error: selectError } = await query;

    if (selectError) {
      throw new Error(`[RetentionEngine] ${table} select failed: ${selectError.message}`);
    }

    const ids = (batch ?? []).map((row) => row.id as string);
    if (ids.length === 0) break;

    const { error: deleteError } = await supabase.from(table).delete().in('id', ids);

    if (deleteError) {
      throw new Error(`[RetentionEngine] ${table} delete failed: ${deleteError.message}`);
    }

    deleted += ids.length;

    if (ids.length < DELETE_BATCH_SIZE) break;
  }

  return deleted;
}

async function deleteExpiredViaPg(thresholdIso: string): Promise<{
  deletedEvents: number;
  deletedTournaments: number;
}> {
  const events = await pgQuery<{ n: number }>(
    `with doomed as (
       select id from events
       where is_aggregated = true
         and starts_at < $1::timestamptz
       limit $2
     ),
     deleted as (
       delete from events e using doomed d where e.id = d.id
       returning e.id
     )
     select count(*)::int as n from deleted`,
    [thresholdIso, DELETE_BATCH_SIZE * 50],
  );

  const tournaments = await pgQuery<{ n: number }>(
    `with doomed as (
       select id from tournaments
       where source is not null
         and starts_at < $1::timestamptz
       limit $2
     ),
     deleted as (
       delete from tournaments t using doomed d where t.id = d.id
       returning t.id
     )
     select count(*)::int as n from deleted`,
    [thresholdIso, DELETE_BATCH_SIZE * 50],
  );

  return {
    deletedEvents: events.rows[0]?.n ?? 0,
    deletedTournaments: tournaments.rows[0]?.n ?? 0,
  };
}

/**
 * Hard-delete expired scraped/aggregated events and tournaments past the retention window.
 * User-created rows are never removed here.
 *
 * Uses `starts_at` (canonical) — scrapes rarely set a full end datetime.
 */
export async function cleanupExpiredEvents(
  retentionPeriodHours: number = SCRAPED_EVENT_RETENTION_HOURS,
): Promise<CleanupExpiredEventsResult> {
  const expirationThreshold = new Date(Date.now() - retentionPeriodHours * 60 * 60 * 1000);
  const thresholdIso = expirationThreshold.toISOString();

  let deletedEvents = 0;
  let deletedTournaments = 0;

  if (hasValidServiceRoleKey()) {
    deletedEvents = await deleteExpiredBatchSupabase('events', thresholdIso);
    deletedTournaments = await deleteExpiredBatchSupabase('tournaments', thresholdIso);
  } else {
    console.warn(
      '[RetentionEngine] SUPABASE_SERVICE_ROLE_KEY missing/placeholder — using DATABASE_URL (pooler).',
    );
    const viaPg = await deleteExpiredViaPg(thresholdIso);
    deletedEvents = viaPg.deletedEvents;
    deletedTournaments = viaPg.deletedTournaments;
  }

  const deleted = deletedEvents + deletedTournaments;

  console.log(
    `[RetentionEngine] Vymazaných ${deletedEvents} eventov + ${deletedTournaments} turnajov (spolu ${deleted}).`,
  );

  return {
    deleted,
    deletedEvents,
    deletedTournaments,
    threshold: thresholdIso,
    retentionPeriodHours,
  };
}
