import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfileByAuthId, type Profile } from '@/lib/data/profile';
import { isAuthBypassEnabled } from '@/lib/auth/demo-mode';
import { ensureProfileForUser } from '@/lib/auth/ensure-profile';
import { SUPPORTED_CITIES } from '@/lib/cities';

export type PageViewer =
  | { status: 'ready'; profile: Profile; userId: string | null; isGuest: boolean }
  | { status: 'setup' };

/** Bratislava guest used when auth bypass is on and nobody is signed in. */
export function guestProfile(): Profile {
  const city = SUPPORTED_CITIES[0] ?? {
    name: 'Bratislava',
    latitude: 48.1486,
    longitude: 17.1077,
  };
  return {
    id: '00000000-0000-4000-a000-000000000001',
    email: 'guest@sportsync.demo',
    username: 'guest',
    fullName: 'Hosť',
    avatarUrl: null,
    coverUrl: null,
    bio: null,
    preferredSports: [],
    sportSkills: {},
    mercenarySports: [],
    role: 'player',
    city: city.name,
    latitude: city.latitude,
    longitude: city.longitude,
    karmaScore: 0,
    seasonPts: 0,
    phoneNumber: null,
    isPhoneVerified: false,
    isEmailVerified: false,
    is2faEnabled: false,
  };
}

/**
 * Page entry helper: signed-in profile, guest profile (bypass), setup race, or login redirect.
 */
export async function getPageViewer(): Promise<PageViewer> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (auth.user) {
    let profile = await getProfileByAuthId(auth.user.id);
    if (!profile) {
      const ensured = await ensureProfileForUser(supabase, auth.user);
      if (ensured.ok) {
        profile = await getProfileByAuthId(auth.user.id);
      }
    }
    if (profile) {
      return { status: 'ready', profile, userId: auth.user.id, isGuest: false };
    }
    return { status: 'setup' };
  }

  if (isAuthBypassEnabled()) {
    return { status: 'ready', profile: guestProfile(), userId: null, isGuest: true };
  }

  redirect('/login');
}
