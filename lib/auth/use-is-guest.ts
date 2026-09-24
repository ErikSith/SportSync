'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isAuthBypassEnabled } from '@/lib/auth/demo-mode';
import { loginHref, type LoginMode } from '@/lib/auth/login-href';

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

    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setIsGuest(!data.user);
      setReady(true);
    });

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
