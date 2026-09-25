import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAnonEnv } from '@/lib/supabase/env';
import { attachCookies, type CookieEntry } from '@/lib/auth/session-cookies';

export const runtime = 'nodejs';

const signinSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(72),
});

function mapSignInError(message: string): { status: number; code: string } {
  const lower = message.toLowerCase();
  if (lower.includes('invalid') || lower.includes('credentials')) {
    return { status: 401, code: 'invalid_credentials' };
  }
  if (lower.includes('email') && lower.includes('confirm')) {
    return { status: 403, code: 'email_not_confirmed' };
  }
  if (lower.includes('rate limit')) {
    return { status: 429, code: 'rate_limit' };
  }
  return { status: 401, code: 'signin_failed' };
}

/**
 * Email/password sign-in with Set-Cookie on the response.
 * Also returns access/refresh tokens so the browser client can `setSession`
 * (Safari often keeps HTTP cookies but leaves the JS client empty).
 */
export async function POST(request: Request) {
  const { url, anonKey, isConfigured } = getSupabaseAnonEnv();
  if (!isConfigured) {
    return NextResponse.json({ error: 'Auth not configured', code: 'signin_unavailable' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'signin_failed' }, { status: 400 });
  }

  const parsed = signinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', code: 'invalid_email' }, { status: 400 });
  }

  const { email, password } = parsed.data;

  try {
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
              // Route Handler may ignore cookieStore.set — attachCookies covers the response.
            }
          });
        },
      },
    });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user || !data.session) {
      const mapped = mapSignInError(error?.message ?? 'signin_failed');
      return NextResponse.json(
        { error: error?.message ?? 'signin_failed', code: mapped.code },
        { status: mapped.status },
      );
    }

    return attachCookies(
      NextResponse.json({
        ok: true,
        userId: data.user.id,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      }),
      pendingCookies,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'signin_failed';
    console.error('[api/auth/signin]', message);
    return NextResponse.json({ error: message, code: 'signin_failed' }, { status: 500 });
  }
}
