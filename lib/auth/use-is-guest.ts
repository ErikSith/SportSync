'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isAuthBypassEnabled } from '@/lib/auth/demo-mode';
import { loginHref, type LoginMode } from '@/lib/auth/login-href';

/**
 * If HTTP cookies hold a session but the browser client storage is empty
 * (common on iOS / PWA after server Set-Cookie login), hydrate via the
 * access-token bridge so UI treats the user as signed-in.
 */
async function hydrateSessionFromCookies(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/access-token', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const body = (await res.json().catch(() => null)) as {
      accessToken?: string | null;
      refreshToken?: string | null;
    } | null;
    if (!body?.accessToken || !body.refreshToken) return false;

    const supabase = createClient();
    const { data, error } = await supabase.auth.setSession({
      access_token: body.accessToken,
      refresh_token: body.refreshToken,
    });
    return !error && !!data.session?.user;
  } catch {
    return false;
  }
}

/**
 * Guest = no Supabase session (browse-with-bypass).
 * While session is loading, treat as guest so profile CTAs don't flash the real profile.
 */
export function useIsGuest(): { isGuest: boolean; ready: boolean } {
  const [isGuest, setIsGuest] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function resolve() {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;

      if (data.user) {
        setIsGuest(false);
        setReady(true);
        return;
      }

      const hydrated = await hydrateSessionFromCookies();
      if (cancelled) return;
      setIsGuest(!hydrated);
      setReady(true);
    }

    void resolve();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsGuest(!session?.user);
      setReady(true);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // When bypass is off, middleware already forces login — still report accurately.
  if (!isAuthBypassEnabled() && !ready) {
    return { isGuest: false, ready: false };
  }

  return { isGuest, ready };
}

/** Profile / account entry: guests go to register; signed-in users to /profile. */
export function useProfileEntryHref(redirectTo = '/profile'): string {
  const { isGuest } = useIsGuest();
  if (isGuest) {
    return loginHref(redirectTo, { mode: 'sign-up' as LoginMode });
  }
  return redirectTo;
}
