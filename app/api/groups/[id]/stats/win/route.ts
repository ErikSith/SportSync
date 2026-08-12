import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const winSchema = z.object({
  userId: z.string().uuid(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: group, error: groupError } = await supabase
    .from('sport_groups')
    .select('owner_id')
    .eq('id', params.id)
    .maybeSingle();

  if (groupError || !group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  if (group.owner_id !== auth.user.id) {
    return NextResponse.json({ error: 'Only the crew owner can record wins' }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = winSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.issues }, { status: 400 });
  }

  const { data: targetMembership, error: targetError } = await supabase
    .from('sport_group_members')
    .select('user_id')
    .eq('group_id', params.id)
    .eq('user_id', parsed.data.userId)
    .maybeSingle();

  if (targetError || !targetMembership) {
    return NextResponse.json({ error: 'Member not in crew' }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from('sport_group_member_stats')
    .select('points, sessions_attended, sessions_declined, wins')
    .eq('group_id', params.id)
    .eq('user_id', parsed.data.userId)
    .maybeSingle();

  const { error: upsertError } = await supabase.from('sport_group_member_stats').upsert(
    {
      group_id: params.id,
      user_id: parsed.data.userId,
      points: existing?.points ?? 0,
      sessions_attended: existing?.sessions_attended ?? 0,
      sessions_declined: existing?.sessions_declined ?? 0,
      wins: (existing?.wins ?? 0) + 1,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'group_id,user_id' },
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
