import { createAdminClient } from '@/lib/supabase/admin';
import { hasValidServiceRoleKey } from '@/lib/db/service-role';
import {
  eventIdentityKey,
  preferIdentityEvent,
} from '@/lib/events/event-identity';

export type DuplicateCleanupReport = {
  scanned: number;
  groups: number;
  deleted: number;
  kept: number;
};

type DupRow = {
  id: string;
  title: string;
  starts_at: string;
  registered_count: number | null;
  venue_id: string | null;
  source_url: string | null;
  ticket_url: string | null;
  is_aggregated: boolean | null;
  cover_url: string | null;
  status: string | null;
};

function toComparable(row: DupRow) {
  return {
    id: row.id,
    title: row.title,
    startsAt: row.starts_at,
    registeredCount: row.registered_count ?? 0,
    venueId: row.venue_id,
    sourceUrl: row.source_url,
    ticketUrl: row.ticket_url,
    isAggregated: Boolean(row.is_aggregated),
    coverUrl: row.cover_url,
  };
}

function pickKeeper(rows: DupRow[]): { keep: DupRow; drop: DupRow[] } {
  let keep = rows[0]!;
  for (let i = 1; i < rows.length; i++) {
    const preferred = preferIdentityEvent(toComparable(keep), toComparable(rows[i]!));
    keep = rows.find((r) => r.id === preferred.id) ?? keep;
  }
  return { keep, drop: rows.filter((r) => r.id !== keep.id) };
}

function groupDuplicates(rows: DupRow[]): {
  scanned: number;
  groups: number;
  kept: number;
  dropIds: string[];
} {
  const groups = new Map<string, DupRow[]>();
  for (const row of rows) {
    if (!row.title) continue;
    const key = eventIdentityKey(row.title, row.starts_at);
    const bucket = groups.get(key);
    if (bucket) bucket.push(row);
    else groups.set(key, [row]);
  }

  let kept = 0;
  let dupGroups = 0;
  const dropIds: string[] = [];

  for (const bucket of groups.values()) {
    if (bucket.length < 2) {
      kept += bucket.length;
      continue;
    }
    dupGroups += 1;
    const { drop } = pickKeeper(bucket);
    kept += 1;
    dropIds.push(...drop.map((r) => r.id));
  }

  return { scanned: rows.length, groups: dupGroups, kept, dropIds };
}

async function cleanupViaSupabase(): Promise<DuplicateCleanupReport> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('events')
    .select(
      'id, title, starts_at, registered_count, venue_id, source_url, ticket_url, is_aggregated, cover_url, status',
    )
    .neq('status', 'cancelled')
    .order('starts_at', { ascending: true })
    .limit(5000);

  if (error) throw new Error(error.message);

  const { scanned, groups, kept, dropIds } = groupDuplicates((data ?? []) as DupRow[]);
  let deleted = 0;

  for (const id of dropIds) {
    const { error: delErr } = await supabase.from('events').delete().eq('id', id);
    if (delErr) {
      console.error('[cleanup-duplicates]', id, delErr.message);
      continue;
    }
    deleted += 1;
  }

  return { scanned, groups, deleted, kept };
}

/** Remove open events that share the same title + local date/time minute. */
export async function cleanupDuplicateEventsByIdentity(): Promise<DuplicateCleanupReport> {
  if (!hasValidServiceRoleKey()) {
    throw new Error(
      '[cleanup-duplicates] SUPABASE_SERVICE_ROLE_KEY missing — pg fallback is not available on Edge.',
    );
  }
  return cleanupViaSupabase();
}
