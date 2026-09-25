import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAnonEnv } from '@/lib/supabase/env';
import { attachCookies, type CookieEntry } from '@/lib/auth/session-cookies';

export const runtime = 'nodejs';

/** Clears Supabase auth cookies on the response (mirror of /api/auth/signin). */
export async function POST() {
  const { url, anonKey, isConfigured } = getSupabaseAnonEnv();
  if (!isConfigured) {
    return NextResponse.json({ ok: true });
  }

  const cookieStore = await cookies();
  const pendingCookies: CookieEntry[] = [];
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieEntry[]) {
        cookiesToSet.forEach((entry) => {
          pendingCookies.push(entry);
          try {
            cookieStore.set(entry.name, entry.value, entry.options);
          } catch {
            // attachCookies covers the response
          }
        });
      },
    },
  });

  await supabase.auth.signOut();

  return attachCookies(NextResponse.json({ ok: true }), pendingCookies);
}
