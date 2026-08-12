import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { parseEventIntent } from '@/lib/ai/event-intent';
import { canCreateOfficialEvent } from '@/lib/auth/tournament-access';

export const runtime = 'edge';

const parseRequestSchema = z.object({
  brief: z.string().min(12).max(4000),
  teamName: z.string().min(1).max(80).optional(),
  organizerName: z.string().min(1).max(80).optional(),
  defaultCity: z.string().optional(),
  mode: z.enum(['community', 'official']).default('community'),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = parseRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid brief payload', issues: parsed.error.issues }, { status: 400 });
  }

  if (parsed.data.mode === 'official') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', auth.user.id)
      .maybeSingle();

    if (!profile || !canCreateOfficialEvent(profile.role as string)) {
      return NextResponse.json({ error: 'Only venue managers and admins can create official events.' }, { status: 403 });
    }
  }

  try {
    const { intent, source } = await parseEventIntent({
      brief: parsed.data.brief,
      teamName: parsed.data.teamName,
      organizerName: parsed.data.organizerName,
      defaultCity: parsed.data.defaultCity,
      mode: parsed.data.mode,
    });

    return NextResponse.json({ ok: true, intent, source });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not parse event brief';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
