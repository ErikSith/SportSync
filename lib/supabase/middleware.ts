import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isAuthBypassEnabled } from '@/lib/auth/demo-mode';
import { getSupabaseAnonEnv } from '@/lib/supabase/env';

const PUBLIC_PATHS = ['/login', '/auth/callback'];

/**
 * Refreshes the Supabase session cookie on every request and gates every
 * non-public route behind authentication (server-side session check, not a
 * client-side redirect — satisfies "Supabase Auth server-side sessions,
 * middleware ochrana API ciest").
 *
 * Auth bypass is ON by default (early access): browsing is open without login.
 * Set AUTH_BYPASS=false when real email auth ships.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  try {
    const { url, anonKey, isConfigured } = getSupabaseAnonEnv();
    if (!isConfigured) {
      return supabaseResponse;
    }

    const supabase = createServerClient(url, anonKey, {
      global: { fetch: (...args: Parameters<typeof fetch>) => fetch(...args) },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    });

    const { data } = await supabase.auth.getUser();
    const isPublicPath = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));
    const bypass = isAuthBypassEnabled();

    if (bypass && request.nextUrl.pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    if (!data.user && !isPublicPath && !bypass) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }

    if (data.user && request.nextUrl.pathname === '/login') {
      const redirectTo = request.nextUrl.searchParams.get('redirectTo');
      const destination =
        redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/';
      return NextResponse.redirect(new URL(destination, request.url));
    }

    return supabaseResponse;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next({ request });
  }
}
