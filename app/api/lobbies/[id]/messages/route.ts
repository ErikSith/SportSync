import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isUuid } from '@/lib/lobby-create';
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
    author: profile?.full_name?.trim() || profile?.username || 'Hráč',
    avatarUrl: profile?.avatar_url ?? null,
  };
}

async function assertLobbyMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lobbyId: string,
  userId: string,
): Promise<boolean> {
  const { data: participant } = await supabase
    .from('lobby_participants')
    .select('user_id')
    .eq('lobby_id', lobbyId)
    .eq('user_id', userId)
    .maybeSingle();
  if (participant) return true;

  const { data: lobby } = await supabase
    .from('lobbies')
    .select('host_id')
    .eq('id', lobbyId)
    .maybeSingle();

  return Boolean(lobby && lobby.host_id === userId);
}

/**
 * GET /api/lobbies/[id]/messages — private lobby chat (members only).
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

  if (!isUuid(params.id)) {
    return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });
  }

  const member = await assertLobbyMember(supabase, params.id, auth.user.id);
  if (!member) {
    return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('lobby_messages')
    .select(
      'id, body, created_at, author_id, profiles!lobby_messages_author_id_fkey ( full_name, username, avatar_url )',
    )
    .eq('lobby_id', params.id)
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
 * POST /api/lobbies/[id]/messages — send a private lobby message.
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

  if (!isUuid(params.id)) {
    return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });
  }

  const member = await assertLobbyMember(supabase, params.id, auth.user.id);
  if (!member) {
    return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });
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
    .from('lobby_messages')
    .insert({
      lobby_id: params.id,
      author_id: auth.user.id,
      body: parsed.data.body,
    })
    .select(
      'id, body, created_at, author_id, profiles!lobby_messages_author_id_fkey ( full_name, username, avatar_url )',
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
