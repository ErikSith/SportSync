import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { isAuthBypassEnabled } from '@/lib/auth/demo-mode';
import { getSupabaseAnonEnv } from '@/lib/supabase/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasValidServiceRoleKey } from '@/lib/db/service-role';

export const runtime = 'edge';

type SessionPayload = {
  accessToken: string | null;
  refreshToken: string | null;
};

/**
 * Returns the caller's access/refresh tokens from HTTP cookies.
 * Mobile Safari often keeps cookies for GET but drops them on POST;
 * the client uses this token as Authorization: Bearer on writes.
 */
export async function GET() {
  const cookieStore = await cookies();
  const { url, anonKey, isConfigured } = getSupabaseAnonEnv();
  if (!isConfigured) {
    return NextResponse.json({ accessToken: null, refreshToken: null } satisfies SessionPayload);
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Read-only — refresh happens in middleware.
      },
    },
  });

  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.access_token) {
    return NextResponse.json({ accessToken: null, refreshToken: null } satisfies SessionPayload);
  }

  return NextResponse.json({
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
  } satisfies SessionPayload);
}

/**
 * Early-access: mint a confirmed guest user + session cookies when the
 * device has no auth (anonymous disabled / email confirm blocks client signup).
 */
export async function POST() {
  if (!isAuthBypassEnabled()) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (!hasValidServiceRoleKey()) {
    return NextResponse.json({ error: 'Guest auth unavailable' }, { status: 503 });
  }

  const { url, anonKey, isConfigured } = getSupabaseAnonEnv();
  if (!isConfigured) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 503 });
  }

  const id = crypto.randomUUID().replace(/-/g, '');
  const email = `guest.${id}@sportsync.demo`;
  const password = `${crypto.randomUUID()}Aa1!`;
  const username = `guest_${id.slice(0, 12)}`;

  try {
    const admin = createAdminClient();
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, role: 'player', full_name: 'Guest' },
    });
    if (created.error || !created.data.user) {
      return NextResponse.json(
        { error: created.error?.message ?? 'Could not create guest' },
        { status: 500 },
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not create guest' },
      { status: 500 },
    );
  }

  const cookieStore = await cookies();
  const pendingCookies: { name: string; value: string; options: CookieOptions }[] = [];

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
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

  const signedIn = await supabase.auth.signInWithPassword({ email, password });
  if (!signedIn.data.session?.access_token) {
    return NextResponse.json(
      { error: signedIn.error?.message ?? 'Could not sign in guest' },
      { status: 500 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    accessToken: signedIn.data.session.access_token,
    refreshToken: signedIn.data.session.refresh_token,
    email,
    password,
    username,
  });

  for (const entry of pendingCookies) {
    response.cookies.set(entry.name, entry.value, entry.options);
  }

  return response;
}
