import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProfileByAuthId } from '@/lib/data/profile';
import { canAccessManageHub } from '@/lib/auth/tournament-access';
import { getVenuesForOrganizer } from '@/lib/data/organizer-venues';
import { getVenueOccupancyStats } from '@/lib/data/venue-analytics';

export const runtime = 'edge';

export async function GET() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const profile = await getProfileByAuthId(auth.user.id);
  if (!profile || !canAccessManageHub(profile.role)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const venues = await getVenuesForOrganizer(profile.id, profile.role);

  // Enrich each venue with occupancy stats
  const enriched = await Promise.all(
    venues.map(async (v) => {
      const stats = await getVenueOccupancyStats(v.id);
      return { ...v, stats };
    }),
  );

  return NextResponse.json({ ok: true, venues: enriched });
}