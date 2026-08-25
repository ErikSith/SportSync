import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE, parseLocale, type Locale } from '@/lib/i18n/config';
import { translate, type MessageKey } from '@/lib/i18n/translate';

export function getLocale(): Locale {
  try {
    const raw = cookies().get(LOCALE_COOKIE)?.value;
    return parseLocale(raw);
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function getT(locale?: Locale) {
  const resolved = locale ?? getLocale();
  return (key: MessageKey, vars?: Record<string, string | number>) =>
    translate(resolved, key, vars);
}

export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  return translate(getLocale(), key, vars);
}
