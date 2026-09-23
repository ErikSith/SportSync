import { NextResponse } from 'next/server';
import { getApiAuthUser } from '@/lib/auth/api-user';
import { reverseGeocodeMeetingPoint } from '@/src/lib/places/meeting-point';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/places/meeting-point/reverse?lat=&lng=
 * Resolves a map pin to a short display name + address.
 */
export async function GET(request: Request) {
  const { user } = await getApiAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const url = new URL(request.url);
  const lat = Number(url.searchParams.get('lat'));
  const lng = Number(url.searchParams.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'Invalid lat/lng' }, { status: 400 });
  }
  if (lat < 47.9 || lat > 48.4 || lng < 16.8 || lng > 17.4) {
    return NextResponse.json({ error: 'Coordinates outside Bratislava area' }, { status: 400 });
  }

  try {
    const place = await reverseGeocodeMeetingPoint(lat, lng);
    return NextResponse.json(place);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /Missing GOOGLE/i.test(message) ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
