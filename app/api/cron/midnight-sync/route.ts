import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAuthorizedCron } from '@/lib/cron/authorize';
import { cleanupExpiredEvents } from '@/lib/retention/events';
import { cleanupExpiredLobbies } from '@/lib/retention/lobbies';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
/** DB cleanup only — no HTML scrape (that lives in /api/cron/scrape-events shards). */
export const maxDuration = 30;

/**
 * Midnight Worker: cheap SQL retention.
 *
 * Scraping used to run here via runAllScrapers() and burned Cloudflare CPU
 * (Cheerio over every Bratislava adapter in one isolate). Do not put it back.
 */
export async function POST(request: Request) {
  const cronOk = isAuthorizedCron(request);

  if (!cronOk) {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }
  }

  try {
    const purge = await cleanupExpiredEvents();
    const lobbyPurge = await cleanupExpiredLobbies();

    return NextResponse.json({
      ok: true,
      purge,
      lobbyPurge,
      scrape: {
        skipped: true,
        reason: 'edge-cpu-budget',
        hint: 'HTML scrape is /api/cron/scrape-events (1 adapter / 30 min slot)',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Midnight sync failed';
    console.error('[midnight-sync]', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
