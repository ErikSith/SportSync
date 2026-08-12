import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProfileByAuthId } from '@/lib/data/profile';
import { canAccessManageHub } from '@/lib/auth/tournament-access';
import { canUseVenueForOrganizer } from '@/lib/data/organizer-venues';
import { getVenueDashboard } from '@/lib/data/venue-analytics';

export const runtime = 'edge';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const profile = await getProfileByAuthId(auth.user.id);
  if (!profile || !canAccessManageHub(profile.role)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const allowed = await canUseVenueForOrganizer(profile.id, profile.role, params.id);
  if (!allowed) {
    return NextResponse.json({ error: 'You do not have access to this venue' }, { status: 403 });
  }

  const dashboard = await getVenueDashboard(params.id);
  return NextResponse.json({ ok: true, ...dashboard });
}