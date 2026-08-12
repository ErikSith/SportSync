import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { updateUserGoal } from '@/lib/data/profile-goals';

const patchSchema = z.object({
  isFeatured: z.boolean().optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid update payload', issues: parsed.error.issues }, { status: 400 });
  }

  const ok = await updateUserGoal(auth.user.id, params.id, parsed.data);
  if (!ok) {
    return NextResponse.json({ error: 'Could not update goal' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
