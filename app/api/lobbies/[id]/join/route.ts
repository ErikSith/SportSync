import { NextResponse } from 'next/server';
import { isUuid } from '@/lib/lobby-create';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!isUuid(params.id)) {
    return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });
  }

  const { data: lobby, error: lobbyError } = await supabase
    .from('lobbies')
    .select('id, status, spots_total, spots_filled, split_pay, lobby_participants(user_id)')
    .eq('id', params.id)
    .maybeSingle();

  if (lobbyError || !lobby) {
    return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });
  }

  const participants = (lobby.lobby_participants ?? []) as Array<{ user_id: string }>;
  if (lobby.status === 'full' || lobby.spots_filled >= lobby.spots_total) {
    return NextResponse.json({ error: 'Lobby is full' }, { status: 409 });
  }
  if (participants.some((p) => p.user_id === auth.user.id)) {
    return NextResponse.json({ error: 'Already joined' }, { status: 409 });
  }

  const { error: joinError } = await supabase.from('lobby_participants').insert({
    lobby_id: lobby.id,
    user_id: auth.user.id,
    payment_status: 'mock',
  });

  if (joinError) {
    return NextResponse.json({ error: joinError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
