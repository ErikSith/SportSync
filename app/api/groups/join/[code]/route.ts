import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(_request: Request, { params }: { params: { code: string } }) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const code = params.code.trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 });
  }

  const { data: group, error: groupError } = await supabase
    .from('sport_groups')
    .select('id, name')
    .eq('invite_code', code)
    .maybeSingle();

  if (groupError || !group) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }

  const { data: existing, error: existingError } = await supabase
    .from('sport_group_members')
    .select('user_id')
    .eq('group_id', group.id)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json({ ok: true, groupId: group.id, alreadyMember: true });
  }

  const { error: joinError } = await supabase.from('sport_group_members').insert({
    group_id: group.id,
    user_id: auth.user.id,
    role: 'member',
  });

  if (joinError) {
    return NextResponse.json({ error: joinError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, groupId: group.id, groupName: group.name });
}
