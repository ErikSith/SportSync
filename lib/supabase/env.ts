/**
 * Safe anon credentials for browser/server/middleware clients.
 * Cloudflare Pages can omit NEXT_PUBLIC_* at build/runtime; also accept
 * SUPABASE_URL / SUPABASE_ANON_KEY (runtime Worker bindings that are not
 * inlined to undefined by Next at build time).
 */
export function getSupabaseAnonEnv(): { url: string; anonKey: string; isConfigured: boolean } {
  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''
  ).trim();
  const anonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (!url || !anonKey) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY — using placeholders to avoid runtime crash',
    );
    return {
      url: 'https://placeholder.supabase.co',
      anonKey: 'public-anon-key',
      isConfigured: false,
    };
  }

  return { url, anonKey, isConfigured: true };
}
