'use client';

import Link from 'next/link';
import { ShareQrButton } from '@/components/home/ShareQrButton';
import { useT } from '@/components/i18n/LocaleProvider';
import { useIsGuest } from '@/lib/auth/use-is-guest';
import { useAuthModal } from '@/components/auth/AuthModalProvider';

interface TopAppBarProps {
  avatarUrl: string | null;
  name: string;
}

export function TopAppBar({ avatarUrl, name }: TopAppBarProps) {
  const t = useT();
  const { isGuest } = useIsGuest();
  const { openAuthModal } = useAuthModal();
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const avatarClassName =
    'relative z-[71] flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-outline-variant/30 text-primary transition-colors hover:text-primary-fixed-dim active:scale-95';

  const avatarInner = avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={name} className="pointer-events-none h-full w-full object-cover" src={avatarUrl} />
  ) : (
    <span className="pointer-events-none flex h-full w-full items-center justify-center bg-surface-container font-label-caps text-[12px] text-on-surface">
      {initials}
    </span>
  );

  return (
    <header className="pointer-events-auto fixed left-0 right-0 top-0 z-[70] flex h-16 w-full max-w-[100vw] items-center justify-between border-b border-outline-variant/30 bg-surface/80 px-4 pt-[env(safe-area-inset-top,0px)] shadow-2xl shadow-black/50 backdrop-blur-xl sm:px-gutter">
      <ShareQrButton />
      <Link
        href="/"
        aria-label={t('nav.home')}
        className="font-display-lg text-display-lg-mobile tracking-tighter text-primary-container transition-colors hover:text-primary-fixed-dim md:font-display-lg"
      >
        SPORTSYNC
      </Link>
      {isGuest ? (
        <button
          type="button"
          aria-label={t('nav.openProfile')}
          onClick={() => openAuthModal({ mode: 'sign-up', redirectTo: '/profile' })}
          className={avatarClassName}
        >
          {avatarInner}
        </button>
      ) : (
        <Link href="/profile" aria-label={t('nav.openProfile')} prefetch className={avatarClassName}>
          {avatarInner}
        </Link>
      )}
    </header>
  );
}
