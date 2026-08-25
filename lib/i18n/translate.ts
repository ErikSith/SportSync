import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config';
import { en, sk, type MessageKey } from '@/lib/i18n/messages';

const catalogs: Record<Locale, Record<MessageKey, string>> = { sk, en };

export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const template = catalogs[locale][key] ?? catalogs[DEFAULT_LOCALE][key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] !== undefined ? String(vars[name]) : `{${name}}`,
  );
}

export type { MessageKey };
