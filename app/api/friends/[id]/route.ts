import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteFriendship } from '@/lib/data/profile-friends';

interface RouteParams {
  params: { id: string };
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const ok = await deleteFriendship(auth.user.id, params.id);
  if (!ok) {
    return NextResponse.json({ error: 'Could not remove friendship' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
