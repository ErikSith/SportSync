import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getProfileGoals } from '@/lib/data/profile-goals';

export const runtime = 'edge';

export async function GET() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase.from('profiles').select('karma_score').eq('id', auth.user.id).single();
  const karmaScore = Number(profile?.karma_score ?? 0);
  const goals = await getProfileGoals(auth.user.id, karmaScore);

  return NextResponse.json({ goals });
}

const createSchema = z.object({
  templateKey: z.string().min(1),
  targetValue: z.number().positive().optional(),
  targetMeta: z.record(z.unknown()).optional(),
  sport: z.string().nullable().optional(),
  title: z.string().optional(),
  isFeatured: z.boolean().optional(),
  deadline: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid goal payload', issues: parsed.error.issues }, { status: 400 });
  }

  const { createUserGoal } = await import('@/lib/data/profile-goals');
  const goal = await createUserGoal(auth.user.id, parsed.data);

  if (!goal) {
    return NextResponse.json({ error: 'Could not create goal' }, { status: 422 });
  }

  return NextResponse.json({ goal }, { status: 201 });
}
