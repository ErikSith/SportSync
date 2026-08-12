import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { GEAR_ITEMS } from '@/lib/data/sport-groups-shared';

export const runtime = 'edge';

const gearSchema = z.object({
  item: z.enum(GEAR_ITEMS),
  claim: z.boolean(),
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
  const parsed = gearSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid gear payload', issues: parsed.error.issues }, { status: 400 });
  }

  if (parsed.data.claim) {
    const { error: insertError } = await supabase.from('sport_group_activity_gear_claims').insert({
      activity_id: params.sessionId,
      item: parsed.data.item,
      user_id: auth.user.id,
    });

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'Someone already claimed this item' }, { status: 409 });
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  } else {
    const { error: deleteError } = await supabase
      .from('sport_group_activity_gear_claims')
      .delete()
      .eq('activity_id', params.sessionId)
      .eq('item', parsed.data.item)
      .eq('user_id', auth.user.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
