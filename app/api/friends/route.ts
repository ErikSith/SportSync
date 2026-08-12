import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFriends, getIncomingFriendRequests } from '@/lib/data/profile-friends';

export async function GET() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const [friends, requests] = await Promise.all([
    getFriends(auth.user.id),
    getIncomingFriendRequests(auth.user.id),
  ]);

  return NextResponse.json({ friends, requests });
}
