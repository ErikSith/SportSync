'use client';

import Link from 'next/link';
import { useT } from '@/components/i18n/LocaleProvider';

/**
 * Shared sticky brand header used on Events / Tournaments / Lobby.
 * Structure is identical — only accent colors change per section.
 */
export type BrandAppBarAccent = 'primary' | 'secondary';

const ACCENT: Record<
  BrandAppBarAccent,
  { border: string; brand: string; iconHover: string }
> = {
  primary: {
    border: 'border-outline-variant/25',
    brand: 'text-primary-container hover:text-primary-fixed-dim',
    iconHover: 'hover:text-primary-container',
  },
  secondary: {
    border: 'border-secondary/15',
    brand: 'text-secondary hover:text-secondary-fixed',
    iconHover: 'hover:text-secondary',
  },
};

interface BrandAppBarProps {
  /** primary = Events / Lobby (orange), secondary = Tournaments (gold) */
  accent?: BrandAppBarAccent;
}

export function BrandAppBar({ accent = 'primary' }: BrandAppBarProps) {
  const t = useT();
  const a = ACCENT[accent];

  return (
    <header
      className={[
        'sticky top-0 z-50 w-full max-w-[100vw] bg-surface/80 backdrop-blur-xl shadow-2xl shadow-black/40',
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
