/**
 * Temporary demo gate — set AUTH_BYPASS=true to skip login for trial demos.
 * Turn off (or remove) when email auth / verification ships.
 */
export function isAuthBypassEnabled(): boolean {
  const raw = process.env.AUTH_BYPASS ?? process.env.NEXT_PUBLIC_AUTH_BYPASS ?? '';
  return raw === 'true' || raw === '1';
}
