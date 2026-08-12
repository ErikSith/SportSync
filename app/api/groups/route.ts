import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { LOBBY_SPORTS } from '@/lib/constants/sports';
import { getMyGroups } from '@/lib/data/sport-groups';
import { generateInviteCode } from '@/lib/utils/invite-code';

const createGroupSchema = z.object({
  name: z.string().min(2).max(80),
  sport: z.enum(LOBBY_SPORTS),
  description: z.string().max(500).optional(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const groups = await getMyGroups(auth.user.id);
  return NextResponse.json({ groups });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createGroupSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid group payload', issues: parsed.error.issues }, { status: 400 });
  }

  const input = parsed.data;
  let inviteCode = generateInviteCode();
  let groupId: string | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: group, error: groupError } = await supabase
      .from('sport_groups')
      .insert({
        owner_id: auth.user.id,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        sport: input.sport,
        invite_code: inviteCode,
      })
      .select('id')
      .single();

    if (!groupError && group) {
      groupId = group.id;
      break;
    }

    if (groupError?.code === '23505') {
      inviteCode = generateInviteCode();
      continue;
    }

    return NextResponse.json({ error: groupError?.message ?? 'Could not create group' }, { status: 500 });
  }

  if (!groupId) {
    return NextResponse.json({ error: 'Could not generate unique invite code' }, { status: 500 });
  }

  const { error: memberError } = await supabase.from('sport_group_members').insert({
    group_id: groupId,
    user_id: auth.user.id,
    role: 'owner',
  });

  if (memberError) {
    await supabase.from('sport_groups').delete().eq('id', groupId);
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, groupId, inviteCode });
}
