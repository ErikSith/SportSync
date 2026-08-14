import { prisma } from '@/lib/prisma';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasValidServiceRoleKey } from '@/lib/db/service-role';
import type { MidnightPurgeStats } from './types';

const DELETE_BATCH = 200;

function pastTournamentWhere(now: Date) {
  return {
    OR: [
      { endsAt: { lt: now } },
      { AND: [{ endsAt: null }, { startsAt: { lt: now } }] },
    ],
  };
}

async function purgeTournamentsViaSupabase(nowIso: string): Promise<number> {
  if (!hasValidServiceRoleKey()) return 0;
  const supabase = createAdminClient();
  let deleted = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('tournaments')
      .select('id')
      .or(`ends_at.lt."${nowIso}",and(ends_at.is.null,starts_at.lt."${nowIso}")`)
      .limit(DELETE_BATCH);

    if (error) {
      console.warn('[midnight-sync.purge] tournament supabase select', error.message);
      break;
    }

    const ids = (data ?? []).map((row) => row.id as string);
    if (ids.length === 0) break;

    const { error: deleteError } = await supabase.from('tournaments').delete().in('id', ids);
    if (deleteError) {
      console.warn('[midnight-sync.purge] tournament supabase delete', deleteError.message);
      break;
    }

    deleted += ids.length;
    if (ids.length < DELETE_BATCH) break;
  }

  return deleted;
}

/**
 * Hard-delete events and tournaments whose start (or tournament end) is already past.
 * Unlinks group activities first so FK rows are not left dangling.
 * Tournaments: also purge via Supabase service role so the feed DB is cleaned
 * even if Prisma's DATABASE_URL differs.
 */
export async function purgePastListings(now = new Date()): Promise<MidnightPurgeStats> {
  const nowIso = now.toISOString();

  await prisma.sportGroupActivity.updateMany({
    where: {
      eventId: { not: null },
      event: { startsAt: { lt: now } },
    },
    data: { eventId: null },
  });

  const events = await prisma.event.deleteMany({
    where: {
      OR: [{ startTime: { lt: now } }, { startsAt: { lt: now } }],
    },
  });

  let deletedTournaments = 0;
  try {
    const tournaments = await prisma.tournament.deleteMany({
      where: pastTournamentWhere(now),
    });
    deletedTournaments = tournaments.count;
  } catch (err) {
    console.warn(
      '[midnight-sync.purge] prisma tournament delete failed',
      err instanceof Error ? err.message : err,
    );
  }

  deletedTournaments += await purgeTournamentsViaSupabase(nowIso);

  const deletedEvents = events.count;

  console.log(
    `[midnight-sync.purge] deleted ${deletedEvents} event(s) + ${deletedTournaments} tournament(s)`,
  );

  return {
    deletedEvents,
    deletedTournaments,
    deleted: deletedEvents + deletedTournaments,
  };
}
