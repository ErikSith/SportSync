import { NextResponse } from 'next/server';
import type { CookieOptions } from '@supabase/ssr';

export type CookieEntry = { name: string; value: string; options: CookieOptions };

/** ~400 days — Chrome's practical cookie lifetime cap. */
const DURABLE_MAX_AGE = 400 * 24 * 60 * 60;

/**
 * Next.js `cookies().set` / `Response.cookies.set` only accept a subset of
 * `cookie` serialize options. Strip unknown fields and force durable defaults
 * so sessions survive browser restarts (not session-only cookies).
 */
export function sanitizeCookieOptions(options: CookieOptions = {}): CookieOptions {
  const sameSite = options.sameSite;
  const normalizedSameSite =
    sameSite === true ? 'strict' : sameSite === false ? undefined : sameSite;

  return {
    path: options.path ?? '/',
    sameSite: normalizedSameSite ?? 'lax',
    httpOnly: options.httpOnly ?? false,
    secure: options.secure,
    maxAge: options.maxAge === 0 ? 0 : (options.maxAge ?? DURABLE_MAX_AGE),
    expires: options.expires,
    domain: options.domain,
  };
}

export function attachCookies(response: NextResponse, pending: CookieEntry[]) {
  for (const entry of pending) {
    response.cookies.set(entry.name, entry.value, sanitizeCookieOptions(entry.options));
  }
  return response;
}
