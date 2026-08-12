import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getSessionById } from '@/lib/data/sport-groups';

export const runtime = 'edge';

const updateSessionSchema = z.object({
  destinationName: z.string().max(120).optional().nullable(),
  destinationAddress: z.string().max(300).optional().nullable(),
  parkingNote: z.string().max(500).optional().nullable(),
  locationNote: z.string().max(200).optional().nullable(),
  venueId: z.string().uuid().optional().nullable(),
  eventId: z.string().uuid().optional().nullable(),
  openToMercenaries: z.boolean().optional(),
  spotsNeeded: z.number().int().min(2).max(30).optional().nullable(),
});

export async function GET(_request: Request, { params }: { params: { id: string; sessionId: string } }) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const session = await getSessionById(params.id, params.sessionId, auth.user.id);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({ session });
}

export async function PATCH(request: Request, { params }: { params: { id: string; sessionId: string } }) {
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

  const json = await request.json().catch(() => null);
  const parsed = updateSessionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid session payload', issues: parsed.error.issues }, { status: 400 });
  }

  const input = parsed.data;
  const updates: Record<string, string | number | boolean | null> = {};

  if (input.destinationName !== undefined) updates.destination_name = input.destinationName?.trim() || null;
  if (input.destinationAddress !== undefined) updates.destination_address = input.destinationAddress?.trim() || null;
  if (input.parkingNote !== undefined) updates.parking_note = input.parkingNote?.trim() || null;
  if (input.locationNote !== undefined) updates.location_note = input.locationNote?.trim() || null;
  if (input.venueId !== undefined) updates.venue_id = input.venueId;
  if (input.eventId !== undefined) updates.event_id = input.eventId;
  if (input.openToMercenaries !== undefined) updates.open_to_mercenaries = input.openToMercenaries;
  if (input.spotsNeeded !== undefined) updates.spots_needed = input.spotsNeeded;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from('sport_group_activities')
    .update(updates)
    .eq('id', params.sessionId)
    .eq('group_id', params.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
