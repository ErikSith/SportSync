import { NextResponse } from 'next/server';
import { isUuid } from '@/lib/lobby-create';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
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
    .select('id, host_id, lobby_participants(user_id)')
    .eq('id', params.id)
    .maybeSingle();

  if (lobbyError || !lobby) {
    return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });
  }

  if (lobby.host_id === auth.user.id) {
    return NextResponse.json({ error: 'Host cannot leave their own lobby' }, { status: 409 });
  }

  const participants = (lobby.lobby_participants ?? []) as Array<{ user_id: string }>;
  if (!participants.some((p) => p.user_id === auth.user.id)) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 404 });
  }

  const { error: leaveError } = await supabase
    .from('lobby_participants')
    .delete()
    .eq('lobby_id', lobby.id)
    .eq('user_id', auth.user.id);

  if (leaveError) {
    return NextResponse.json({ error: leaveError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
