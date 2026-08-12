import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logGoalProgress } from '@/lib/data/profile-goals';

const logSchema = z.object({
  value: z.number().positive().default(1),
  note: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = logSchema.safeParse(json ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid log payload', issues: parsed.error.issues }, { status: 400 });
  }

  const goal = await logGoalProgress(auth.user.id, params.id, parsed.data.value, parsed.data.note);
  if (!goal) {
    return NextResponse.json({ error: 'Could not log progress' }, { status: 422 });
  }

  return NextResponse.json({ goal });
}
