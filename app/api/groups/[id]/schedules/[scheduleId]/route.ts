import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

const updateScheduleSchema = z.object({
  isActive: z.boolean(),
});

async function assertMembership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  groupId: string,
  userId: string,
) {
  const { data: membership, error } = await supabase
    .from('sport_group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();

  return !error && membership;
}

export async function PATCH(request: Request, { params }: { params: { id: string; scheduleId: string } }) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!(await assertMembership(supabase, params.id, auth.user.id))) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  const json = await request.json().catch(() => null);
  const parsed = updateScheduleSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.issues }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from('sport_group_recurring_schedules')
    .update({ is_active: parsed.data.isActive })
    .eq('id', params.scheduleId)
    .eq('group_id', params.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: { id: string; scheduleId: string } }) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!(await assertMembership(supabase, params.id, auth.user.id))) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  const { error: deleteError } = await supabase
    .from('sport_group_recurring_schedules')
    .delete()
    .eq('id', params.scheduleId)
    .eq('group_id', params.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
