import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseAnonEnv } from '@/lib/supabase/env';

/**
 * Supabase client for Client Components (browser / Edge).
 * Uses the platform `fetch` — never Node.js APIs such as `process.version`.
 */
export function createClient() {
  const { url, anonKey } = getSupabaseAnonEnv();
  return createBrowserClient(url, anonKey, {
    global: { fetch: (...args: Parameters<typeof fetch>) => fetch(...args) },
  });
}
