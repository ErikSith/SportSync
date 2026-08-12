/**
 * Early-access gate: login/registration is skipped by default so first users
 * can browse as a guest. Set AUTH_BYPASS=false (or 0) when real auth ships.
 */
export function isAuthBypassEnabled(): boolean {
  const raw = process.env.AUTH_BYPASS ?? process.env.NEXT_PUBLIC_AUTH_BYPASS;
  if (raw === undefined || raw === '') return true;
  return raw === 'true' || raw === '1';
}
