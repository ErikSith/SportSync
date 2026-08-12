import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { boundingBox, DEFAULT_RADIUS_KM, EXTENDED_RADIUS_KM } from '@/lib/geo';

export const runtime = 'edge';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const radiusParam = searchParams.get('radius');
  const radius = radiusParam === '50' ? EXTENDED_RADIUS_KM : DEFAULT_RADIUS_KM;

  // Get user profile for personalization
  const { data: profile } = await supabase
    .from('profiles')
    .select('city, latitude, longitude, preferred_sports')
    .eq('id', auth.user.id)
    .maybeSingle();

  const userLat = profile?.latitude as number | null;
  const userLng = profile?.longitude as number | null;
  const preferredSports = (profile?.preferred_sports as string[] | null) ?? [];
  const userCity = (profile?.city as string) ?? null;

  // Build query filters
  const now = new Date().toISOString();

  // 1. Fetch pending match suggestions for this user
  const { data: suggestions, error: suggestionsError } = await supabase
    .from('match_suggestions')
    .select('*')
    .eq('user_id', auth.user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20);

  if (suggestionsError && process.env.NODE_ENV !== 'production') {
    console.error('[feed] match_suggestions query failed', suggestionsError.message);
  }

  // 2. Fetch open events (within radius or same city)
  let eventsQuery = supabase
    .from('events')
    .select('id, title, sport, city, type, status, price, capacity, registered_count, starts_at, latitude, longitude, cover_url, created_at')
    .in('status', ['open', 'full'])
    .gte('starts_at', now)
    .order('starts_at', { ascending: true })
    .limit(20);

  if (userLat != null && userLng != null) {
    const box = boundingBox(userLat, userLng, radius);
    eventsQuery = eventsQuery
      .gte('latitude', box.minLat)
      .lte('latitude', box.maxLat)
      .gte('longitude', box.minLng)
      .lte('longitude', box.maxLng);
  } else if (userCity) {
    eventsQuery = eventsQuery.eq('city', userCity);
  }

let events = (await eventsQuery).data ?? [];
  let usedAllEventsFallback = false;
  // Fallback to extended radius if no events found
  if (events.length === 0 && radius === DEFAULT_RADIUS_KM && userLat != null && userLng != null) {
    const fallbackRadius = EXTENDED_RADIUS_KM;
    const fallbackBox = boundingBox(userLat, userLng, fallbackRadius);
    const fallbackQuery = supabase
      .from('events')
      .select('id, title, sport, city, type, status, price, capacity, registered_count, starts_at, latitude, longitude, cover_url, created_at')
      .in('status', ['open', 'full', 'live'])
      .gte('starts_at', now)
      .order('starts_at', { ascending: true })
      .limit(20)
      .gte('latitude', fallbackBox.minLat)
      .lte('latitude', fallbackBox.maxLat)
      .gte('longitude', fallbackBox.minLng)
      .lte('longitude', fallbackBox.maxLng);
    const { data: fallbackEvents } = await fallbackQuery;
    events = fallbackEvents ?? [];
  }

  // Final fallback: all active events (includes official rows with null GPS)
  if (events.length === 0) {
    const { data: allEvents } = await supabase
      .from('events')
      .select('id, title, sport, city, type, status, price, capacity, registered_count, starts_at, latitude, longitude, cover_url, created_at')
      .in('status', ['open', 'full', 'live'])
      .gte('starts_at', now)
      .order('starts_at', { ascending: true })
      .limit(40);
    events = allEvents ?? [];
    usedAllEventsFallback = events.length > 0;
  }

  // 3. Fetch open lobbies (within radius or same city)
  let lobbiesQuery = supabase
    .from('lobbies')
    .select('id, sport, format, city, status, spots_total, spots_filled, cost_per_player, split_pay, mercenary_mode, scheduled_at, latitude, longitude, created_at')
    .eq('status', 'open')
    .gte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(20);

  if (userLat != null && userLng != null) {
    const box = boundingBox(userLat, userLng, radius);
    lobbiesQuery = lobbiesQuery
      .gte('latitude', box.minLat)
      .lte('latitude', box.maxLat)
      .gte('longitude', box.minLng)
      .lte('longitude', box.maxLng);
  } else if (userCity) {
    lobbiesQuery = lobbiesQuery.eq('city', userCity);
  }

let lobbies = (await lobbiesQuery).data ?? [];
  // Fallback to extended radius if no lobbies found
  if (lobbies.length === 0 && radius === DEFAULT_RADIUS_KM && userLat != null && userLng != null) {
    const fallbackRadius = EXTENDED_RADIUS_KM;
    const fallbackBox = boundingBox(userLat, userLng, fallbackRadius);
    const fallbackQuery = supabase
      .from('lobbies')
      .select('id, sport, format, city, status, spots_total, spots_filled, cost_per_player, split_pay, mercenary_mode, scheduled_at, latitude, longitude, created_at')
      .eq('status', 'open')
      .gte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(20)
      .gte('latitude', fallbackBox.minLat)
      .lte('latitude', fallbackBox.maxLat)
      .gte('longitude', fallbackBox.minLng)
      .lte('longitude', fallbackBox.maxLng);
    const { data: fallbackLobbies } = await fallbackQuery;
    lobbies = fallbackLobbies ?? [];
  }

  // 4. Fetch open tournaments (within radius or same city)
  let tournamentsQuery = supabase
    .from('tournaments')
    .select('id, name, sport, format, city, status, entry_fee, max_participants, current_participants, skill_level_min, skill_level_max, starts_at, latitude, longitude, cover_url, created_at')
    .eq('status', 'REGISTRATION_OPEN')
    .gte('starts_at', now)
    .order('starts_at', { ascending: true })
    .limit(10);

  if (userLat != null && userLng != null) {
    const box = boundingBox(userLat, userLng, radius);
    tournamentsQuery = tournamentsQuery
      .gte('latitude', box.minLat)
      .lte('latitude', box.maxLat)
      .gte('longitude', box.minLng)
      .lte('longitude', box.maxLng);
  } else if (userCity) {
    tournamentsQuery = tournamentsQuery.eq('city', userCity);
  }

let tournaments = (await tournamentsQuery).data ?? [];
  // Fallback to extended radius if no tournaments found
  if (tournaments.length === 0 && radius === DEFAULT_RADIUS_KM && userLat != null && userLng != null) {
    const fallbackRadius = EXTENDED_RADIUS_KM;
    const fallbackBox = boundingBox(userLat, userLng, fallbackRadius);
    const fallbackQuery = supabase
      .from('tournaments')
      .select('id, name, sport, format, city, status, entry_fee, max_participants, current_participants, skill_level_min, skill_level_max, starts_at, latitude, longitude, cover_url, created_at')
      .eq('status', 'REGISTRATION_OPEN')
      .gte('starts_at', now)
      .order('starts_at', { ascending: true })
      .limit(10)
      .gte('latitude', fallbackBox.minLat)
      .lte('latitude', fallbackBox.maxLat)
      .gte('longitude', fallbackBox.minLng)
      .lte('longitude', fallbackBox.maxLng);
    const { data: fallbackTournaments } = await fallbackQuery;
    tournaments = fallbackTournaments ?? [];
  }

  if (tournaments.length === 0) {
    const { data: allTournaments } = await supabase
      .from('tournaments')
      .select('id, name, sport, format, city, status, entry_fee, max_participants, current_participants, skill_level_min, skill_level_max, starts_at, latitude, longitude, cover_url, created_at')
      .eq('status', 'REGISTRATION_OPEN')
      .gte('starts_at', now)
      .order('starts_at', { ascending: true })
      .limit(20);
    tournaments = allTournaments ?? [];
  }

  return NextResponse.json({
    ok: true,
    radius,
    used_all_events_fallback: usedAllEventsFallback,
    message: usedAllEventsFallback ? 'Showing all available events' : null,
    user: {
      city: userCity,
      preferredSports,
      hasLocation: userLat != null && userLng != null,
    },
    suggestions: suggestions ?? [],
    events: events ?? [],
    lobbies: lobbies ?? [],
    tournaments: tournaments ?? [],
    total: (suggestions?.length ?? 0) + (events?.length ?? 0) + (lobbies?.length ?? 0) + (tournaments?.length ?? 0),
  });
}