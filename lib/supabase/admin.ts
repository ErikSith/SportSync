import { createClient } from '@supabase/supabase-js';
import { getServiceRoleKey } from '@/lib/db/service-role';
import { getSupabaseAnonEnv } from '@/lib/supabase/env';

/** Service-role client for scrapers/cron — bypasses RLS. Never import in client components. */
export function createAdminClient() {
  const { url, isConfigured } = getSupabaseAnonEnv();
  const key = getServiceRoleKey();
  if (!isConfigured || !url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (...args: Parameters<typeof fetch>) => fetch(...args) },
  });
}
