import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

const inviteSchema = z.object({
  username: z.string().min(2).max(50),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = inviteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid invite payload', issues: parsed.error.issues }, { status: 400 });
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

  const username = parsed.data.username.trim().toLowerCase();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, username')
    .ilike('username', username)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  }

  if (profile.id === auth.user.id) {
    return NextResponse.json({ error: 'You are already in this crew' }, { status: 400 });
  }

  const { data: existing, error: existingError } = await supabase
    .from('sport_group_members')
    .select('user_id')
    .eq('group_id', params.id)
    .eq('user_id', profile.id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json({ error: 'Player is already in this crew' }, { status: 409 });
  }

  const { error: joinError } = await supabase.from('sport_group_members').insert({
    group_id: params.id,
    user_id: profile.id,
    role: 'member',
  });

  if (joinError) {
    return NextResponse.json({ error: joinError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, userId: profile.id, username: profile.username });
}
