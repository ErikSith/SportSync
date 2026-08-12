import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { recordMatchResult } from '@/lib/data/match-results';

export const runtime = 'edge';

const recordSchema = z.object({
  sport: z.string().min(1),
  contextType: z.enum(['lobby', 'tournament', 'group_session', 'lesson']),
  contextId: z.string().uuid(),
  participantIds: z.array(z.string().uuid()).min(1),
  winnerId: z.string().uuid().optional().nullable(),
  score: z.record(z.unknown()).optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = recordSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.issues }, { status: 400 });
  }

  const result = await recordMatchResult(parsed.data, auth.user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, result: result.data });
}
