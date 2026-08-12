import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { acceptFriendRequest } from '@/lib/data/profile-friends';

export const runtime = 'edge';

interface RouteParams {
  params: { id: string };
}

export async function POST(_request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const ok = await acceptFriendRequest(auth.user.id, params.id);
  if (!ok) {
    return NextResponse.json({ error: 'Could not accept request' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
