/**
 * Early-access gate: login/registration is skipped by default so first users
 * can browse as a guest. Set AUTH_BYPASS=false (or 0) when real auth ships.
 *
 * Client bundles only see NEXT_PUBLIC_* — keep NEXT_PUBLIC_AUTH_BYPASS in sync
 * with AUTH_BYPASS so silent guest lobby/crew create works on phones.
 */
export function isAuthBypassEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_AUTH_BYPASS ?? process.env.AUTH_BYPASS;
  if (raw === undefined || raw === '') return true;
  return raw === 'true' || raw === '1';
}
