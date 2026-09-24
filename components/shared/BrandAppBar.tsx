'use client';

import Link from 'next/link';
import { useT } from '@/components/i18n/LocaleProvider';

/**
 * Shared sticky brand header used on Events / Tournaments / Lobby / Programs.
 * Structure is identical — only accent colors change per section.
 */
export type BrandAppBarAccent = 'primary' | 'events' | 'schedules' | 'secondary' | 'programs';

const ACCENT: Record<
  BrandAppBarAccent,
  { border: string; brand: string; iconHover: string; barBg: string }
> = {
  primary: {
    border: 'border-outline-variant/25',
    brand: 'text-primary-container hover:text-primary-fixed-dim',
    iconHover: 'hover:text-primary-container',
    barBg: 'bg-surface/80',
  },
  events: {
    border: 'border-[#E53935]/18',
    brand: 'text-[#E53935] hover:text-[#ff6b66]',
    iconHover: 'hover:text-[#E53935]',
    barBg: 'bg-[#141212]/90',
  },
  schedules: {
    border: 'border-[#8EB4C8]/20',
    brand: 'text-[#8EB4C8] hover:text-[#b0cdda]',
    iconHover: 'hover:text-[#8EB4C8]',
    barBg: 'bg-[#121518]/90',
  },
  secondary: {
    border: 'border-secondary/15',
    brand: 'text-secondary hover:text-secondary-fixed',
    iconHover: 'hover:text-secondary',
    barBg: 'bg-[#16140f]/85',
  },
  programs: {
    border: 'border-teal-400/20',
    brand: 'text-teal-300 hover:text-teal-200',
    iconHover: 'hover:text-teal-300',
    barBg: 'bg-[#121615]/90',
  },
};

interface BrandAppBarProps {
  /** primary = Lobby, events = red, schedules = soft steel-blue, secondary = gold, programs = teal */
  accent?: BrandAppBarAccent;
}

export function BrandAppBar({ accent = 'primary' }: BrandAppBarProps) {
  const t = useT();
  const a = ACCENT[accent];

  return (
    <header
      className={[
        'sticky top-0 z-50 w-full max-w-[100vw] backdrop-blur-xl shadow-2xl shadow-black/40',
        a.barBg,
        'border-b',
        a.border,
      ].join(' ')}
    >
      <div className="mx-auto flex h-16 w-full max-w-screen-xl items-center justify-between px-4 pt-[env(safe-area-inset-top,0px)] sm:px-container-margin-mobile md:px-container-margin-desktop">
        <span className="h-10 w-10" aria-hidden />
        <Link
          href="/"
          aria-label={t('nav.home')}
          className={[
            'font-display-lg-mobile text-display-lg-mobile tracking-tighter uppercase transition-colors',
            a.brand,
          ].join(' ')}
        >
          SPORTSYNC
        </Link>
        <button
          type="button"
          className={[
            'rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container/50',
            a.iconHover,
          ].join(' ')}
          aria-label={t('nav.notifications')}
        >
          <span className="material-symbols-outlined">notifications</span>
        </button>
      </div>
    </header>
  );
}
