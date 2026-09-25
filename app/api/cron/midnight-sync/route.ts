import { NextResponse } from 'next/server';
import { cleanupExpiredEvents } from '@/lib/retention/events';
import { cleanupExpiredLobbies } from '@/lib/retention/lobbies';
import { isScrapingEnabled } from '@/lib/scrape/scraping-enabled';
import { runMidnightBatchedScrapers } from '@/lib/scrape/run';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Vercel Hobby maximum — cleanup + budgeted scrape must finish inside this window. */
export const maxDuration = 300;

/**
 * Midnight Worker (Vercel Cron `0 0 * * *`):
 * 1) Purge expired scraped listings / lobbies (never group classes)
 * 2) Batched venue scrape — only when SCRAPING_ENABLED is on
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
    // 1) Cleanup first — only scraped/aggregated rows past retention (never user events / group classes).
    const purge = await cleanupExpiredEvents();
    const lobbyPurge = await cleanupExpiredLobbies();

    // 2) Scraping off by default — venues publish via /manage.
    if (!isScrapingEnabled()) {
      return NextResponse.json({
        ok: true,
        purge,
        lobbyPurge,
        scrape: {
          skipped: true,
          reason: 'SCRAPING_ENABLED is off — venues publish via /manage',
        },
      });
    }

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
