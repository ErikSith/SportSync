export const LOCALES = ['sk', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'sk';
export const LOCALE_COOKIE = 'sportsync_locale';

export function parseLocale(value: string | undefined | null): Locale {
  return value === 'en' ? 'en' : 'sk';
}

export function localeToHtmlLang(locale: Locale): string {
  return locale === 'en' ? 'en' : 'sk';
}

export function localeToDateLocale(locale: Locale): string {
  return locale === 'en' ? 'en-GB' : 'sk-SK';
}
