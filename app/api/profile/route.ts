import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getProfileByAuthId, updateProfile } from '@/lib/data/profile';
import { EVENT_SPORTS } from '@/lib/constants/sports';
import { parseSportSkills } from '@/lib/profile/sport-skills';

export const runtime = 'edge';

const patchSchema = z.object({
  fullName: z.string().min(1).max(80).nullable().optional(),
  bio: z.string().max(160).nullable().optional(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
  preferredSports: z
    .array(z.enum(EVENT_SPORTS))
    .max(7)
    .optional(),
  sportSkills: z.record(z.string(), z.number().int().min(1).max(4)).optional(),
  mercenarySports: z
    .array(z.enum(EVENT_SPORTS))
    .max(7)
    .optional(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const profile = await getProfileByAuthId(auth.user.id);
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.issues }, { status: 400 });
  }

  const { sportSkills: rawSkills, preferredSports, mercenarySports, ...rest } = parsed.data;
  const result = await updateProfile(auth.user.id, {
    ...rest,
    preferredSports,
    mercenarySports,
    sportSkills: rawSkills !== undefined ? parseSportSkills(rawSkills) : undefined,
  });
  if (!result.ok) {
    const status = result.error === 'Profile not found' ? 404 : result.error.includes('username') ? 409 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ profile: result.profile });
}
