import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateBracket, getBracket, reportMatchResult } from '@/lib/tournaments/bracket';

export const runtime = 'edge';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const rounds = await getBracket(params.id);
  return NextResponse.json({ ok: true, rounds });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const json = await request.json().catch(() => ({}));
  const action = (json as { action?: string }).action ?? 'generate';

  if (action === 'generate') {
    const result = await generateBracket(params.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    const rounds = await getBracket(params.id);
    return NextResponse.json({ ok: true, rounds });
  }

  if (action === 'report') {
    const { matchId, winnerId, score, sport } = json as {
      matchId?: string;
      winnerId?: string;
      score?: string;
      sport?: string;
    };
    if (!matchId || !winnerId) {
      return NextResponse.json({ error: 'matchId and winnerId required' }, { status: 400 });
    }
    const result = await reportMatchResult(matchId, winnerId, score ?? '', sport ?? 'TENNIS');
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    const rounds = await getBracket(params.id);
    return NextResponse.json({ ok: true, rounds });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
