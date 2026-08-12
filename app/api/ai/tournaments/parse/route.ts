import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { parseTournamentIntent } from '@/lib/ai/tournament-intent';
import { canCreateTournament } from '@/lib/auth/tournament-access';

export const runtime = 'edge';

const parseRequestSchema = z.object({
  brief: z.string().min(12).max(4000),
  organizerName: z.string().min(1).max(80).optional(),
  defaultCity: z.string().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  if (!canCreateTournament(profile.role as string)) {
    return NextResponse.json({ error: 'Only venue managers and admins can create tournaments.' }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = parseRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid brief payload', issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const { intent, source } = await parseTournamentIntent({
      brief: parsed.data.brief,
      organizerName: parsed.data.organizerName,
      defaultCity: parsed.data.defaultCity,
    });

    return NextResponse.json({ ok: true, intent, source });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not parse tournament brief';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
