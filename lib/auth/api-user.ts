import type { User } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

function bearerFromAuthorization(raw: string | null): string | undefined {
  const match = raw?.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token || undefined;
}

/**
 * Resolve the signed-in user for Route Handlers.
 * Cookies first (middleware-refreshed), then Authorization Bearer —
 * iOS / PWA / tunnel clients sometimes send the JWT but drop cookies.
 */
export async function getApiAuthUser(): Promise<{
  user: User | null;
  supabase: Awaited<ReturnType<typeof createClient>>;
}> {
  const supabase = await createClient();
  const fromCookies = await supabase.auth.getUser();
  if (fromCookies.data.user) {
    return { user: fromCookies.data.user, supabase };
  }

  const headerStore = await headers();
  const bearer = bearerFromAuthorization(headerStore.get('authorization'));
  if (!bearer) {
    return { user: null, supabase };
  }

  const fromJwt = await supabase.auth.getUser(bearer);
  return { user: fromJwt.data.user ?? null, supabase };
}
