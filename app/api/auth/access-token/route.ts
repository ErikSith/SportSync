import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { isAuthBypassEnabled } from '@/lib/auth/demo-mode';
import { getSupabaseAnonEnv } from '@/lib/supabase/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasValidServiceRoleKey } from '@/lib/db/service-role';
import { attachCookies, type CookieEntry } from '@/lib/auth/session-cookies';

// Node runtime: Edge often cannot read non-NEXT_PUBLIC secrets reliably,
// which broke guest mint on phones (503 Guest auth unavailable → lobby 401).
export const runtime = 'nodejs';

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

  // getUser validates/refreshes; getSession alone can return an expired JWT
  // that mobile clients then send as Bearer → 401 on every write.
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ accessToken: null, refreshToken: null } satisfies SessionPayload);
  }

  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.access_token) {
    return NextResponse.json({ accessToken: null, refreshToken: null } satisfies SessionPayload);
  }

  return attachCookies(
    NextResponse.json({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    } satisfies SessionPayload),
    pendingCookies,
  );
}

/**
 * Early-access: mint a session for phones with no login.
 * 1) Anonymous auth (anon key only)
 * 2) Admin-created confirmed guest + password (service/secret key)
 */
export async function POST() {
  if (!isAuthBypassEnabled()) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { url, anonKey, isConfigured } = getSupabaseAnonEnv();
  if (!isConfigured) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 503 });
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
            // Route may be read-only for cookieStore in some runtimes.
          }
        });
      },
    },
  });

  const id = crypto.randomUUID().replace(/-/g, '');
  const username = `guest_${id.slice(0, 12)}`;

  // Prefer anonymous — works without service role when enabled in Supabase Auth.
  const anon = await supabase.auth.signInAnonymously({
    options: {
      data: { username, role: 'player', full_name: 'Guest' },
    },
  });
  if (anon.data.session?.access_token) {
    return attachCookies(
      NextResponse.json({
        ok: true,
        accessToken: anon.data.session.access_token,
        refreshToken: anon.data.session.refresh_token,
        username,
      }),
      pendingCookies,
    );
  }

  if (!hasValidServiceRoleKey()) {
    return NextResponse.json(
      {
        error: 'Guest auth unavailable',
        detail: anon.error?.message ?? 'Anonymous auth disabled and no service role key',
      },
      { status: 503 },
    );
  }

  const email = `guest.${id}@sportsync.demo`;
  const password = `${crypto.randomUUID()}Aa1!`;

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

  const signedIn = await supabase.auth.signInWithPassword({ email, password });
  if (!signedIn.data.session?.access_token) {
    return NextResponse.json(
      { error: signedIn.error?.message ?? 'Could not sign in guest' },
      { status: 500 },
    );
  }

  return attachCookies(
    NextResponse.json({
      ok: true,
      accessToken: signedIn.data.session.access_token,
      refreshToken: signedIn.data.session.refresh_token,
      email,
      password,
      username,
    }),
    pendingCookies,
  );
}
