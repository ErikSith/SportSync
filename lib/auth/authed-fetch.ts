'use client';

import { createClient } from '@/lib/supabase/client';
import { isAuthBypassEnabled } from '@/lib/auth/demo-mode';

const GUEST_CREDS_KEY = 'sportsync.guest-auth';

function deviceGuestCredentials(): { email: string; password: string; username: string } {
  try {
    const raw = localStorage.getItem(GUEST_CREDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { email?: string; password?: string; username?: string };
      if (parsed.email && parsed.password) {
        return {
          email: parsed.email,
          password: parsed.password,
          username: parsed.username ?? `guest_${parsed.email.slice(6, 18)}`,
        };
      }
    }
  } catch {
    // Ignore unreadable storage and mint new credentials.
  }

  const id = crypto.randomUUID().replace(/-/g, '');
  const creds = {
    email: `guest.${id}@sportsync.demo`,
    password: `${crypto.randomUUID()}Aa1!`,
    username: `guest_${id.slice(0, 12)}`,
  };
  try {
    localStorage.setItem(GUEST_CREDS_KEY, JSON.stringify(creds));
  } catch {
    // Private mode — still try the one-shot sign-up.
  }
  return creds;
}

function persistGuestCredentials(creds: {
  email: string;
  password: string;
  username?: string;
}) {
  try {
    localStorage.setItem(GUEST_CREDS_KEY, JSON.stringify(creds));
  } catch {
    // Private mode — session cookies / memory token still usable this turn.
  }
}

async function applySessionTokens(
  accessToken: string,
  refreshToken: string | null | undefined,
): Promise<string> {
  if (refreshToken) {
    const supabase = createClient();
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }
  return accessToken;
}

async function tokenFromBrowserSession(): Promise<string | undefined> {
  const supabase = createClient();

  // Prefer getUser — refreshes from cookies / storage when possible.
  const userResult = await supabase.auth.getUser();
  if (userResult.data.user) {
    const session = await supabase.auth.getSession();
    if (session.data.session?.access_token) {
      return session.data.session.access_token;
    }
  }

  const existing = await supabase.auth.getSession();
  return existing.data.session?.access_token;
}

/**
 * Pull tokens from HTTP cookies via a same-origin GET.
 * iOS / PWA often keep cookies on navigations but the browser client storage
 * is empty — and POST later drops cookies entirely.
 */
async function tokenFromServerCookies(): Promise<string | undefined> {
  try {
    const res = await fetch('/api/auth/access-token', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) return undefined;
    const body = (await res.json().catch(() => null)) as {
      accessToken?: string | null;
      refreshToken?: string | null;
    } | null;
    if (!body?.accessToken) return undefined;
    return applySessionTokens(body.accessToken, body.refreshToken);
  } catch {
    return undefined;
  }
}

async function tokenFromServerGuestMint(): Promise<string | undefined> {
  try {
    const res = await fetch('/api/auth/access-token', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) return undefined;
    const body = (await res.json().catch(() => null)) as {
      accessToken?: string;
      refreshToken?: string;
      email?: string;
      password?: string;
      username?: string;
    } | null;
    if (body?.email && body.password) {
      persistGuestCredentials({
        email: body.email,
        password: body.password,
        username: body.username,
      });
    }
    if (!body?.accessToken) return undefined;
    return applySessionTokens(body.accessToken, body.refreshToken);
  } catch {
    return undefined;
  }
}

/**
 * Early-access write path: if nobody is signed in, create a silent session
 * so Create Crew / Lobby works on phones without the login screen.
 */
async function ensureAccessToken(): Promise<string | undefined> {
  const fromBrowser = await tokenFromBrowserSession();
  if (fromBrowser) return fromBrowser;

  const fromCookies = await tokenFromServerCookies();
  if (fromCookies) return fromCookies;

  if (!isAuthBypassEnabled()) return undefined;

  const supabase = createClient();

  const anon = await supabase.auth.signInAnonymously({
    options: {
      data: {
        username: `guest_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
        role: 'player',
        full_name: 'Guest',
      },
    },
  });
  if (anon.data.session?.access_token) return anon.data.session.access_token;

  const creds = deviceGuestCredentials();
  const signedIn = await supabase.auth.signInWithPassword({
    email: creds.email,
    password: creds.password,
  });
  if (signedIn.data.session?.access_token) return signedIn.data.session.access_token;

  const signedUp = await supabase.auth.signUp({
    email: creds.email,
    password: creds.password,
    options: {
      data: { username: creds.username, role: 'player', full_name: 'Guest' },
    },
  });
  if (signedUp.data.session?.access_token) return signedUp.data.session.access_token;

  const retry = await supabase.auth.signInWithPassword({
    email: creds.email,
    password: creds.password,
  });
  if (retry.data.session?.access_token) return retry.data.session.access_token;

  // Last resort: service-role guest mint + Set-Cookie (works when anonymous
  // auth is off and email confirmations block client signUp).
  return tokenFromServerGuestMint();
}

/**
 * Same-origin fetch that always sends cookies and, when present, the
 * Supabase access token. Mobile Safari / PWA / tunnels often drop cookies
 * on POST while the browser client still has a valid session.
 */
export async function authedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = await ensureAccessToken();

  const headers = new Headers(init.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(input, {
    ...init,
    credentials: init.credentials ?? 'include',
    headers,
  });

  // One retry: mint/refresh token if the write bounced as unauthenticated.
  if (res.status !== 401 || headers.has('X-Authed-Retry')) {
    return res;
  }

  const refreshed =
    (await tokenFromServerCookies()) ||
    (isAuthBypassEnabled() ? await tokenFromServerGuestMint() : undefined) ||
    (await ensureAccessToken());

  if (!refreshed || refreshed === token) {
    return res;
  }

  const retryHeaders = new Headers(init.headers);
  retryHeaders.set('Authorization', `Bearer ${refreshed}`);
  retryHeaders.set('X-Authed-Retry', '1');

  return fetch(input, {
    ...init,
    credentials: init.credentials ?? 'include',
    headers: retryHeaders,
  });
}
