import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { boundingBox, DEFAULT_RADIUS_KM, EXTENDED_RADIUS_KM } from '@/lib/geo';

export const runtime = 'edge';

/**
 * Public venue discovery endpoint.
 *
 * Mirrors the locality logic used by `app/api/feed/route.ts`:
 *  - 20km bounding-box pre-filter (DEFAULT_RADIUS_KM) when the user has GPS
 *  - 50km fallback (EXTENDED_RADIUS_KM) when nothing is found within 20km
 *  - city-wide fallback when the user has no GPS coordinates
 *
 * Optional query params:
 *  - `sport`  : filter venues that offer this sport
 *  - `radius` : '50' to request the extended radius up-front
 *  - `city`   : explicit city filter (overrides GPS-based city fallback)
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const radiusParam = searchParams.get('radius');
  const radius = radiusParam === '50' ? EXTENDED_RADIUS_KM : DEFAULT_RADIUS_KM;
  const sportParam = searchParams.get('sport');
  const cityParam = searchParams.get('city');

  // Resolve the requesting user (optional — discovery works unauthenticated too)
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;

  let userLat: number | null = null;
  let userLng: number | null = null;
  let userCity: string | null = cityParam ?? null;

  if (userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('city, latitude, longitude')
      .eq('id', userId)
      .maybeSingle();
    userLat = (profile?.latitude as number | null) ?? null;
    userLng = (profile?.longitude as number | null) ?? null;
    if (!userCity) userCity = (profile?.city as string) ?? null;
  }

  const buildQuery = (box?: ReturnType<typeof boundingBox>) => {
    let q = supabase
      .from('venues')
      .select(
        'id, name, description, city, sports, address, latitude, longitude, verified, website_url, created_at',
      )
      .order('verified', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(250);

    if (sportParam) {
      q = q.contains('sports', [sportParam]);
    }
    if (box) {
      q = q
        .gte('latitude', box.minLat)
        .lte('latitude', box.maxLat)
        .gte('longitude', box.minLng)
        .lte('longitude', box.maxLng);
    } else if (userCity) {
      q = q.eq('city', userCity);
    }
    return q;
  };

  let venues = (await buildQuery(userLat != null && userLng != null ? boundingBox(userLat, userLng, radius) : undefined)).data ?? [];

  // Fallback to extended radius when GPS is present but nothing nearby
  if (venues.length === 0 && userLat != null && userLng != null && radius === DEFAULT_RADIUS_KM) {
    const fallbackBox = boundingBox(userLat, userLng, EXTENDED_RADIUS_KM);
    venues = (await buildQuery(fallbackBox)).data ?? [];
  }

  // Final fallback: city-wide (covers no-GPS users and empty extended results)
  if (venues.length === 0 && userCity) {
    venues = (await buildQuery()).data ?? [];
  }

  return NextResponse.json({
    ok: true,
    radius,
    city: userCity,
    hasLocation: userLat != null && userLng != null,
    venues,
    total: venues.length,
  });
}