import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getIncomingFriendRequests } from '@/lib/data/profile-friends';

export async function GET() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const requests = await getIncomingFriendRequests(auth.user.id);
  return NextResponse.json({ requests });
}
