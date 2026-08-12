import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { recomputeMemberStats } from '@/lib/data/sport-groups';

export const runtime = 'edge';

const rsvpSchema = z.object({
  status: z.enum(['pending', 'going', 'maybe', 'declined']).optional(),
  paid: z.boolean().optional(),
  userId: z.string().uuid().optional(),
});

export async function POST(request: Request, { params }: { params: { id: string; sessionId: string } }) {
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

  const { data: activity, error: activityError } = await supabase
    .from('sport_group_activities')
    .select('id')
    .eq('id', params.sessionId)
    .eq('group_id', params.id)
    .maybeSingle();

  if (activityError || !activity) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const json = await request.json().catch(() => null);
  const parsed = rsvpSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid RSVP payload', issues: parsed.error.issues }, { status: 400 });
  }

  const input = parsed.data;
  const targetUserId = input.userId ?? auth.user.id;

  if (targetUserId !== auth.user.id && membership.role !== 'owner') {
    return NextResponse.json({ error: 'Only the crew owner can update other members' }, { status: 403 });
  }

  const { data: targetMembership, error: targetError } = await supabase
    .from('sport_group_members')
    .select('user_id')
    .eq('group_id', params.id)
    .eq('user_id', targetUserId)
    .maybeSingle();

  if (targetError || !targetMembership) {
    return NextResponse.json({ error: 'Member not in crew' }, { status: 404 });
  }

  const { data: existing, error: existingError } = await supabase
    .from('sport_group_activity_rsvps')
    .select('status, paid')
    .eq('activity_id', params.sessionId)
    .eq('user_id', targetUserId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const nextStatus = input.status ?? existing?.status ?? 'pending';
  const nextPaid = input.paid ?? existing?.paid ?? false;

  if (existing) {
    const { error: updateError } = await supabase
      .from('sport_group_activity_rsvps')
      .update({ status: nextStatus, paid: nextPaid, updated_at: new Date().toISOString() })
      .eq('activity_id', params.sessionId)
      .eq('user_id', targetUserId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  } else {
    const { error: insertError } = await supabase.from('sport_group_activity_rsvps').insert({
      activity_id: params.sessionId,
      user_id: targetUserId,
      status: nextStatus,
      paid: nextPaid,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  if (input.status && input.status !== existing?.status) {
    await recomputeMemberStats(supabase, params.id, targetUserId);
  }

  return NextResponse.json({ ok: true, status: nextStatus, paid: nextPaid });
}
