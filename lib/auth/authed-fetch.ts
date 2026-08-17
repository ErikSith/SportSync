'use client';

import { createClient } from '@/lib/supabase/client';

/**
 * Same-origin fetch that always sends cookies and, when present, the
 * Supabase access token. Mobile Safari / PWA / tunnels often drop cookies
 * on POST while the browser client still has a valid session.
 */
export async function authedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

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
