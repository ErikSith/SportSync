import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

const postSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

type MessageRow = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  profiles: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

function mapMessage(row: MessageRow) {
  const profile = row.profiles;
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    authorId: row.author_id,
    author: profile?.full_name?.trim() || profile?.username || 'Member',
    avatarUrl: profile?.avatar_url ?? null,
  };
}

/**
 * GET /api/groups/[id]/messages — private crew chat (members only).
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
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

  const { data, error } = await supabase
    .from('sport_group_messages')
    .select(
      'id, body, created_at, author_id, profiles!sport_group_messages_author_id_fkey ( full_name, username, avatar_url )',
    )
    .eq('group_id', params.id)
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    messages: ((data ?? []) as unknown as MessageRow[]).map(mapMessage),
  });
}

/**
 * POST /api/groups/[id]/messages — send a private crew message.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
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
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid message', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from('sport_group_messages')
    .insert({
      group_id: params.id,
      author_id: auth.user.id,
      body: parsed.data.body,
    })
    .select(
      'id, body, created_at, author_id, profiles!sport_group_messages_author_id_fkey ( full_name, username, avatar_url )',
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'Could not send message' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: mapMessage(data as unknown as MessageRow),
  });
}
