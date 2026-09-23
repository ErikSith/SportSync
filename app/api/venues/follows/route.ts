import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  followVenue,
  getFollowedVenueIds,
  unfollowVenue,
} from '@/lib/data/venue-follows';

export const runtime = 'edge';

const bodySchema = z.object({
  venueId: z.string().uuid(),
});

/** GET /api/venues/follows — list followed venue IDs for the signed-in user. */
export async function GET() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const venueIds = await getFollowedVenueIds(auth.user.id);
  return NextResponse.json({ venueIds });
}

/** POST /api/venues/follows — follow a venue. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { data: venue } = await supabase
    .from('venues')
    .select('id')
    .eq('id', parsed.data.venueId)
    .maybeSingle();
  if (!venue) {
    return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
  }

  const result = await followVenue(auth.user.id, parsed.data.venueId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, following: true });
}

/** DELETE /api/venues/follows — unfollow a venue (?venueId=). */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const venueId = searchParams.get('venueId')?.trim() ?? '';
  const parsed = bodySchema.safeParse({ venueId });
  if (!parsed.success) {
    return NextResponse.json({ error: 'venueId required' }, { status: 400 });
  }

  const result = await unfollowVenue(auth.user.id, parsed.data.venueId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, following: false });
}
