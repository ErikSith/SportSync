import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseAnonEnv } from '@/lib/supabase/env';
import { attachCookies, type CookieEntry } from '@/lib/auth/session-cookies';
import { safeRedirectPath } from '@/lib/utils/safe-redirect';

export const runtime = 'nodejs';

/** Handles Supabase email-confirmation / magic-link redirects (PKCE code exchange). */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeRedirectPath(searchParams.get('next'));

  if (code) {
    const { url, anonKey, isConfigured } = getSupabaseAnonEnv();
    if (isConfigured) {
      const pendingCookies: CookieEntry[] = [];
      const supabase = createServerClient(url, anonKey, {
        cookies: {
          getAll() {
            // Request cookies only — exchange writes go to pendingCookies.
            const header = request.headers.get('cookie') ?? '';
            return header
              .split(';')
              .map((part) => part.trim())
              .filter(Boolean)
              .map((part) => {
                const eq = part.indexOf('=');
                if (eq === -1) return { name: part, value: '' };
                return {
                  name: part.slice(0, eq),
                  value: decodeURIComponent(part.slice(eq + 1)),
                };
              });
          },
          setAll(cookiesToSet: CookieEntry[]) {
            cookiesToSet.forEach((entry) => pendingCookies.push(entry));
          },
        },
      });

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return attachCookies(NextResponse.redirect(`${origin}${next}`), pendingCookies);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
