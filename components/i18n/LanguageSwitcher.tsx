'use client';

import { LOCALES, type Locale } from '@/lib/i18n/config';
import { useLocale } from '@/components/i18n/LocaleProvider';

const FLAGS: Record<Locale, { emoji: string; label: string }> = {
  sk: { emoji: '🇸🇰', label: 'Slovenčina' },
  en: { emoji: '🇬🇧', label: 'English' },
};

interface LanguageSwitcherProps {
  className?: string;
}

/** Compact flag-only locale toggle (profile header). */
export function LanguageSwitcher({ className = '' }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border border-white/12 bg-black/40 p-0.5 backdrop-blur-md ${className}`}
      role="group"
      aria-label={t('profile.language')}
    >
      {LOCALES.map((code: Locale) => {
        const active = locale === code;
        const flag = FLAGS[code];
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-label={flag.label}
            aria-pressed={active}
            title={flag.label}
            className={[
              'flex h-8 w-8 items-center justify-center rounded-full text-[16px] leading-none transition-transform active:scale-90',
              active
                ? 'bg-white/15 ring-1 ring-white/25'
                : 'opacity-55 hover:opacity-90',
            ].join(' ')}
          >
            <span aria-hidden>{flag.emoji}</span>
          </button>
        );
      })}
    </div>
  );
}
