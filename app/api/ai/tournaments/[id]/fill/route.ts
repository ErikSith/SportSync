import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeTournamentFill } from '@/lib/ai/tournament-agent';

export const runtime = 'edge';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const analysis = await analyzeTournamentFill(params.id);
  if (!analysis) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, analysis });
}
