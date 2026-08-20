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
 * Prefer Authorization Bearer when present — iOS / PWA / tunnels often send
 * the JWT on writes while dropping cookies on POST.
 */
export async function getApiAuthUser(): Promise<{
  user: User | null;
  supabase: Awaited<ReturnType<typeof createClient>>;
}> {
  const headerStore = await headers();
  const bearer = bearerFromAuthorization(headerStore.get('authorization'));
  const supabase = await createClient();

  if (bearer) {
    const fromJwt = await supabase.auth.getUser(bearer);
    if (fromJwt.data.user) {
      return { user: fromJwt.data.user, supabase };
    }
  }

  const fromCookies = await supabase.auth.getUser();
  if (fromCookies.data.user) {
    return { user: fromCookies.data.user, supabase };
  }

  return { user: null, supabase };
}
