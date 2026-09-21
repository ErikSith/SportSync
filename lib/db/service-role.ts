/**
 * Resolve the privileged Supabase key.
 * Prefer classic service-role JWT; fall back to dashboard "secret" key
 * (`SUPABASE_SECRET_KEY`) used by newer Supabase projects.
 */
export function getServiceRoleKey(): string | undefined {
  const candidates = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_SECRET_KEY,
  ];
  for (const raw of candidates) {
    const key = raw?.trim();
    if (!key) continue;
    if (/fill-in|placeholder|your[_-]?service/i.test(key)) continue;
    if (key.length <= 40) continue;
    return key;
  }
  return undefined;
}

/** True when a usable service/secret key is configured (no pg import). */
export function hasValidServiceRoleKey(): boolean {
  return Boolean(getServiceRoleKey());
}
