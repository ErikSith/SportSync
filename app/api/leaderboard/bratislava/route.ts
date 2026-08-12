import { NextResponse } from 'next/server';
import { getBratislavaVenueLeaderboard } from '@/lib/data/bratislava-leaderboard';

export const runtime = 'edge';

/**
 * City Leaderboard for Bratislava venues (VISION.md "City Leaderboards" pillar).
 *
 * Returns venues in Bratislava ranked by a composite popularity score derived
 * from event frequency, registrations, unique players, and verification status.
 *
 * Query params:
 *  - `limit` : max number of entries (default 20, capped at 50)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawLimit = Number(searchParams.get('limit'));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 20;

  const entries = await getBratislavaVenueLeaderboard(limit);

  return NextResponse.json({
    ok: true,
    city: 'Bratislava',
    total: entries.length,
    leaderboard: entries,
  });
}