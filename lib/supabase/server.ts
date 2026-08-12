import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAnonEnv } from '@/lib/supabase/env';

/**
 * Supabase client for Server Components / Route Handlers / Server Actions.
 * Reads the session from the request cookies that `middleware.ts` keeps fresh.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseAnonEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render, where cookies are read-only.
          // Harmless as long as middleware.ts is refreshing the session on every request.
        }
      },
    },
  });
}
