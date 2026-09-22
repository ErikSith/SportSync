import { NextResponse } from 'next/server';
import { getApiAuthUser } from '@/lib/auth/api-user';
import { getProfileByAuthId } from '@/lib/data/profile';

/** ADMIN-only gate for /api/dev/* scraper tools. */
export async function requireDevAdmin(): Promise<
  | { ok: true; profileId: string }
  | { ok: false; response: NextResponse }
> {
  const { user } = await getApiAuthUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    };
  }
  const profile = await getProfileByAuthId(user.id);
  if (!profile || profile.role !== 'ADMIN') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authorized' }, { status: 403 }),
    };
  }
  return { ok: true, profileId: profile.id };
}
