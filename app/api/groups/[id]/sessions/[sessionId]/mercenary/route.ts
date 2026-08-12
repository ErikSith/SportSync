import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { findCityByName, SUPPORTED_CITIES } from '@/lib/cities';

export async function POST(_request: Request, { params }: { params: { id: string; sessionId: string } }) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from('sport_group_members')
    .select('role')
    .eq('group_id', params.id)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  const { data: activity, error: activityError } = await supabase
    .from('sport_group_activities')
    .select(
      'id, title, sport, scheduled_at, open_to_mercenaries, spots_needed, mercenary_lobby_id, sport_group_activity_rsvps ( status )',
    )
    .eq('id', params.sessionId)
    .eq('group_id', params.id)
    .maybeSingle();

  if (activityError || !activity) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (activity.mercenary_lobby_id) {
    return NextResponse.json({ error: 'A mercenary lobby is already live for this session', lobbyId: activity.mercenary_lobby_id }, { status: 400 });
  }

  if (!activity.open_to_mercenaries || !activity.spots_needed) {
    return NextResponse.json({ error: 'Set a spots-needed target and enable mercenaries first' }, { status: 400 });
  }

  const rsvps = (activity.sport_group_activity_rsvps ?? []) as { status: string }[];
  const goingCount = rsvps.filter((r) => r.status === 'going').length;

  if (goingCount >= activity.spots_needed) {
    return NextResponse.json({ error: 'The crew already has enough players' }, { status: 400 });
  }

  const { data: profile } = await supabase.from('profiles').select('city').eq('id', auth.user.id).maybeSingle();
  const defaultCity = SUPPORTED_CITIES[0];
  if (!defaultCity) {
    return NextResponse.json({ error: 'No supported city configured' }, { status: 500 });
  }
  const city = (profile?.city && findCityByName(profile.city)) || defaultCity;

  const missing = activity.spots_needed - goingCount;
  const spotsTotal = Math.min(10, Math.max(2, missing + 1));
  const scheduledAt = new Date(activity.scheduled_at);
  const isFuture = scheduledAt > new Date();

  const { data: lobby, error: lobbyError } = await supabase
    .from('lobbies')
    .insert({
      host_id: auth.user.id,
      sport: activity.sport,
      format: 'group',
      city: city.name,
      scheduled_at: isFuture ? scheduledAt.toISOString() : new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      spots_total: spotsTotal,
      cost_per_player: 0,
      split_pay: false,
      mercenary_mode: true,
      latitude: city.latitude,
      longitude: city.longitude,
      status: 'open',
    })
    .select('id')
    .single();

  if (lobbyError || !lobby) {
    return NextResponse.json({ error: lobbyError?.message ?? 'Could not create mercenary lobby' }, { status: 500 });
  }

  const { error: joinError } = await supabase.from('lobby_participants').insert({
    lobby_id: lobby.id,
    user_id: auth.user.id,
    payment_status: 'mock',
  });

  if (joinError) {
    await supabase.from('lobbies').delete().eq('id', lobby.id);
    return NextResponse.json({ error: joinError.message }, { status: 500 });
  }

  const { error: linkError } = await supabase
    .from('sport_group_activities')
    .update({ mercenary_lobby_id: lobby.id })
    .eq('id', params.sessionId)
    .eq('group_id', params.id);

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, lobbyId: lobby.id });
}
