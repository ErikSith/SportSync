import { NextResponse } from 'next/server';
import { cleanupExpiredEvents } from '@/lib/retention/events';
import { cleanupExpiredLobbies } from '@/lib/retention/lobbies';
import { runMidnightBatchedScrapers } from '@/lib/scrape/run';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Vercel Hobby maximum — cleanup + budgeted scrape must finish inside this window. */
export const maxDuration = 300;

/**
 * Midnight Worker (Vercel Cron `0 0 * * *`):
 * 1) Purge expired scraped listings / lobbies
 * 2) Batched venue scrape under a wall-clock budget (no daytime load)
 *
 * Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
 * Optional: `?from=<adapterIndex>` to resume a partial fleet pass.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const fromParam = url.searchParams.get('from');
  const fromParsed = fromParam != null && fromParam !== '' ? Number(fromParam) : NaN;
  const startIndex = Number.isFinite(fromParsed) ? fromParsed : undefined;

  try {
    // 1) Cleanup first — only scraped/aggregated rows past retention (never user events).
    const purge = await cleanupExpiredEvents();
    const lobbyPurge = await cleanupExpiredLobbies();

    // 2) Polite batched scrape (sequential adapters + delays, hard time budget).
    const scrape = await runMidnightBatchedScrapers({ startIndex });

    return NextResponse.json({
      ok: true,
      purge,
      lobbyPurge,
      scrape,
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
