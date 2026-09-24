import { safeRedirectPath } from '@/lib/utils/safe-redirect';

export type LoginMode = 'sign-in' | 'sign-up';

/** Build `/login` URL with safe redirect + optional start tab. */
export function loginHref(
  redirectTo?: string | null,
  opts?: { mode?: LoginMode },
): string {
  const params = new URLSearchParams();
  params.set('redirectTo', safeRedirectPath(redirectTo, '/'));
  if (opts?.mode) {
    params.set('mode', opts.mode);
  }
  return `/login?${params.toString()}`;
}
