import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseAnonEnv } from '@/lib/supabase/env';

/** Supabase client for use in Client Components (browser). */
export function createClient() {
  const { url, anonKey } = getSupabaseAnonEnv();
  return createBrowserClient(url, anonKey);
}
