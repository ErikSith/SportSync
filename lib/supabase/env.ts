/**
 * Safe anon credentials for browser/server/middleware clients.
 * Cloudflare Pages can omit NEXT_PUBLIC_* at runtime; placeholders keep
 * `createClient` / `new URL()` from throwing an unhandled exception.
 */
export function getSupabaseAnonEnv(): { url: string; anonKey: string; isConfigured: boolean } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — using placeholders to avoid runtime crash',
    );
    return {
      url: 'https://placeholder.supabase.co',
      anonKey: 'public-anon-key',
      isConfigured: false,
    };
  }

  return { url, anonKey, isConfigured: true };
}
