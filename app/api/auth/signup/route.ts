import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSupabaseAnonEnv } from '@/lib/supabase/env';
import { hasValidServiceRoleKey } from '@/lib/db/service-role';
import { ensureProfileForUser } from '@/lib/auth/ensure-profile';

export const runtime = 'nodejs';

const signupSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(6).max(72),
  username: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid username'),
  // Ignored — every self-serve signup is a player. Venue owners are granted in DB.
  role: z.string().optional(),
});

type CookieEntry = { name: string; value: string; options: CookieOptions };

function attachCookies(response: NextResponse, pending: CookieEntry[]) {
  for (const entry of pending) {
    response.cookies.set(entry.name, entry.value, entry.options);
  }
  return response;
}

function mapSignupError(message: string): { status: number; code: string } {
  const lower = message.toLowerCase();
  if (lower.includes('already') || lower.includes('registered') || lower.includes('exists')) {
    return { status: 409, code: 'email_taken' };
  }
  if (lower.includes('password')) {
    return { status: 400, code: 'weak_password' };
  }
  if (lower.includes('email') && lower.includes('invalid')) {
    return { status: 400, code: 'invalid_email' };
  }
  if (lower.includes('rate limit')) {
    return { status: 429, code: 'rate_limit' };
  }
  return { status: 400, code: 'signup_failed' };
}

/**
 * Instant email/password registration via service role.
 * Creates a confirmed user (bypasses mailer confirm + rate limits),
 * ensures profiles row, then establishes a cookie session.
 */
export async function POST(request: Request) {
  if (!hasValidServiceRoleKey()) {
    return NextResponse.json({ error: 'signup_unavailable', code: 'signup_unavailable' }, { status: 503 });
  }

  const { url, anonKey, isConfigured } = getSupabaseAnonEnv();
  if (!isConfigured) {
    return NextResponse.json({ error: 'Auth not configured', code: 'signup_unavailable' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'signup_failed' }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path?.[0];
    const code =
      path === 'email'
        ? 'invalid_email'
        : path === 'password'
          ? 'weak_password'
          : path === 'username'
            ? 'invalid_username'
            : 'signup_failed';
    return NextResponse.json({ error: issue?.message ?? 'Invalid input', code }, { status: 400 });
  }

  const { email, password, username } = parsed.data;
  const role = 'player';

  try {
    const admin = createAdminClient();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, role },
    });

    if (createError || !created.user) {
      const mapped = mapSignupError(createError?.message ?? 'signup_failed');
      return NextResponse.json(
        { error: createError?.message ?? 'signup_failed', code: mapped.code },
        { status: mapped.status },
      );
    }

    await ensureProfileForUser(admin, created.user);

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
              // Route may be read-only for cookieStore in some runtimes.
            }
          });
        },
      },
    });

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      return NextResponse.json(
        {
          error: signInError.message,
          code: 'signin_after_signup_failed',
          userId: created.user.id,
        },
        { status: 500 },
      );
    }

    return attachCookies(
      NextResponse.json({ ok: true, userId: created.user.id }),
      pendingCookies,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'signup_failed';
    console.error('[api/auth/signup]', message);
    return NextResponse.json({ error: message, code: 'signup_failed' }, { status: 500 });
  }
}
