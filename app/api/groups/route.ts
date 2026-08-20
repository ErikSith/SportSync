import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getApiAuthUser } from '@/lib/auth/api-user';
import { ensureProfileForUser } from '@/lib/auth/ensure-profile';
import { LOBBY_SPORTS } from '@/lib/constants/sports';
import { getMyGroups } from '@/lib/data/sport-groups';
import { generateInviteCode } from '@/lib/utils/invite-code';

export const runtime = 'edge';

const createGroupSchema = z.object({
  name: z.string().min(2).max(80),
  sport: z.enum(LOBBY_SPORTS).optional(),
  description: z.string().max(500).optional(),
});

export async function GET() {
  const { user } = await getApiAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const groups = await getMyGroups(user.id);
  return NextResponse.json({ groups });
}

export async function POST(request: Request) {
  const { user, supabase } = await getApiAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const profileReady = await ensureProfileForUser(supabase, user);
  if (!profileReady.ok) {
    return NextResponse.json(
      { error: profileReady.error || 'Could not prepare player profile' },
      { status: 500 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = createGroupSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid group payload', issues: parsed.error.issues }, { status: 400 });
  }

  const input = parsed.data;
  const sport = input.sport ?? 'FOOTBALL';
  let inviteCode = generateInviteCode();
  let groupId: string | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: group, error: groupError } = await supabase
      .from('sport_groups')
      .insert({
        owner_id: user.id,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        sport,
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
    user_id: user.id,
    role: 'owner',
  });

  if (memberError) {
    await supabase.from('sport_groups').delete().eq('id', groupId);
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, groupId, inviteCode });
}
