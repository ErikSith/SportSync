/** True when Supabase service role key is configured (no pg import). */
export function hasValidServiceRoleKey(): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return false;
  if (/fill-in|placeholder|your[_-]?service/i.test(key)) return false;
  return key.length > 40;
}
