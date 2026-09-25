import { createAdminClient } from '@/lib/supabase/admin';
import { hasValidServiceRoleKey } from '@/lib/db/service-role';

export {
  FEED_ACTIVE_GRACE_HOURS,
  activeFeedSince,
  activeFeedSinceIso,
  feedStartsAtFloor,
  isListingStillActive,
} from '@/lib/retention/feed-window';

/** Hard-delete scraped events this many hours after `starts_at`. */
export const SCRAPED_EVENT_RETENTION_HOURS = 48;

const DELETE_BATCH_SIZE = 200;

/** Keep all Skupinové cvičenia — scraped (`class-*`) and manage-created. */
function isGroupClassListing(row: {
  external_id?: string | null;
  theme_config?: unknown;
}): boolean {
  const externalId = (row.external_id ?? '').toLowerCase();
  if (externalId.startsWith('class-')) return true;
  const theme = row.theme_config;
  if (theme && typeof theme === 'object' && theme !== null) {
    const bucket = (theme as { listingBucket?: unknown }).listingBucket;
    if (bucket === 'group_class') return true;
  }
  return false;
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
    if (table === 'events') {
      // Exclude Skupinové cvičenia (`class-*` / `class-manage-*`) at query level
      // so protected rows do not stall the batch cursor.
      const { data: batch, error: selectError } = await supabase
        .from('events')
        .select('id, external_id, theme_config')
        .eq('is_aggregated', true)
        .lt('starts_at', thresholdIso)
        .or('external_id.is.null,external_id.not.ilike.class-%')
        .limit(DELETE_BATCH_SIZE);

      if (selectError) {
        throw new Error(`[RetentionEngine] events select failed: ${selectError.message}`);
      }

      const ids = (batch ?? [])
        .filter((row) => !isGroupClassListing(row))
        .map((row) => row.id as string);

      if (ids.length === 0) break;

      const { error: deleteError } = await supabase.from('events').delete().in('id', ids);
      if (deleteError) {
        throw new Error(`[RetentionEngine] events delete failed: ${deleteError.message}`);
      }

      deleted += ids.length;
      if ((batch?.length ?? 0) < DELETE_BATCH_SIZE) break;
      continue;
    }

    const { data: batch, error: selectError } = await supabase
      .from(table)
      .select('id')
      .lt('starts_at', thresholdIso)
      .limit(DELETE_BATCH_SIZE)
      .not('source', 'is', null);

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
  const { pgQuery } = await import('@/lib/db/pg');

  const events = await pgQuery<{ n: number }>(
    `with doomed as (
       select id from events
       where is_aggregated = true
         and starts_at < $1::timestamptz
         and coalesce(external_id, '') not ilike 'class-%'
         and coalesce(theme_config->>'listingBucket', '') <> 'group_class'
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
 * User-created rows and Skupinové cvičenia (group classes) are never removed here.
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
