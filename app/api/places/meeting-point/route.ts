import { NextResponse } from 'next/server';
import { getApiAuthUser } from '@/lib/auth/api-user';
import { searchMeetingPoints } from '@/src/lib/places/meeting-point';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/places/meeting-point?q=Most+SNP
 * Bratislava-biased Places search for landmarks (bridges, parks, …).
 */
export async function GET(request: Request) {
  const { user } = await getApiAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) {
    return NextResponse.json({ places: [] });
  }

  try {
    const places = await searchMeetingPoints(q, { limit: 6 });
    return NextResponse.json({ places });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /Missing GOOGLE/i.test(message) ? 503 : 502;
    return NextResponse.json({ error: message, places: [] }, { status });
  }
}
