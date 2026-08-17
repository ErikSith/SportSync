'use client';

import { createClient } from '@/lib/supabase/client';
import { isAuthBypassEnabled } from '@/lib/auth/demo-mode';

const GUEST_CREDS_KEY = 'sportsync.guest-auth';

function deviceGuestCredentials(): { email: string; password: string } {
  try {
    const raw = localStorage.getItem(GUEST_CREDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { email?: string; password?: string };
      if (parsed.email && parsed.password) return { email: parsed.email, password: parsed.password };
    }
  } catch {
    // Ignore unreadable storage and mint new credentials.
  }

  const creds = {
    email: `guest.${crypto.randomUUID().replace(/-/g, '')}@sportsync.demo`,
    password: `${crypto.randomUUID()}Aa1!`,
  };
  try {
    localStorage.setItem(GUEST_CREDS_KEY, JSON.stringify(creds));
  } catch {
    // Private mode — still try the one-shot sign-up.
  }
  return creds;
}

/**
 * Early-access write path: if nobody is signed in, create a silent session
 * so Create Crew / Lobby works on phones without the login screen.
 */
async function ensureAccessToken(): Promise<string | undefined> {
  const supabase = createClient();
  const existing = await supabase.auth.getSession();
  if (existing.data.session?.access_token) return existing.data.session.access_token;
  if (!isAuthBypassEnabled()) return undefined;

  const anon = await supabase.auth.signInAnonymously({
    options: { data: { username: 'guest', role: 'player' } },
  });
  if (anon.data.session?.access_token) return anon.data.session.access_token;

  const creds = deviceGuestCredentials();
  const signedIn = await supabase.auth.signInWithPassword(creds);
  if (signedIn.data.session?.access_token) return signedIn.data.session.access_token;

  const signedUp = await supabase.auth.signUp({
    email: creds.email,
    password: creds.password,
    options: { data: { username: 'guest', role: 'player' } },
  });
  if (signedUp.data.session?.access_token) return signedUp.data.session.access_token;

  const retry = await supabase.auth.signInWithPassword(creds);
  return retry.data.session?.access_token;
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

  return fetch(input, {
    ...init,
    credentials: init.credentials ?? 'include',
    headers,
  });
}
