'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  UserPlus,
  Calendar,
  Trophy,
  MapPin,
  Dumbbell,
  BarChart3,
  User,
  Sparkles,
  X,
  type LucideIcon,
} from 'lucide-react';
import { THUMB_BUTTON_ENABLED } from '@/components/navigation/thumb-button-flags';
import { useT } from '@/components/i18n/LocaleProvider';
import type { MessageKey } from '@/lib/i18n/messages';

type NavItem = {
  href: string;
  labelKey: MessageKey;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

/**
 * Order = top → bottom in the open menu.
 * Least-used first (farther from thumb), most-used last (closest to FAB).
 */
const NAV_ITEMS: NavItem[] = [
  {
    href: '/leaderboard',
    labelKey: 'nav.ranking',
    icon: BarChart3,
    match: (p) => p === '/leaderboard' || p.startsWith('/ranking'),
  },
  {
    href: '/trainers',
    labelKey: 'nav.trainers',
    icon: Dumbbell,
    match: (p) => p === '/trainers' || p.startsWith('/trainers/'),
  },
  {
    href: '/tournaments',
    labelKey: 'nav.tournaments',
    icon: Trophy,
    match: (p) => p === '/tournaments' || p.startsWith('/tournaments/'),
  },
  {
    href: '/venues',
    labelKey: 'nav.venues',
    icon: MapPin,
    match: (p) => p === '/venues' || p.startsWith('/venues/'),
  },
  {
    href: '/events',
    labelKey: 'nav.events',
    icon: Calendar,
    match: (p) => p === '/events' || p.startsWith('/events/'),
  },
  {
    href: '/profile',
    labelKey: 'nav.profile',
    icon: User,
    match: (p) => p === '/profile' || p.startsWith('/profile/') || p.startsWith('/players/'),
  },
  {
    href: '/lobby',
    labelKey: 'nav.lobby',
    icon: UserPlus,
    match: (p) => p === '/lobby' || p.startsWith('/lobby/'),
  },
];

const HIDDEN_PREFIXES = ['/login', '/auth'];

export function ThumbButton() {
  const pathname = usePathname();
  const t = useT();
  const [open, setOpen] = useState(false);
  const hidden =
    !THUMB_BUTTON_ENABLED ||
    HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (hidden) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[60] pb-[env(safe-area-inset-bottom,0px)] pr-[env(safe-area-inset-right,0px)] md:bottom-8 md:right-8">
      <AnimatePresence>
        {open && (
          <motion.button
            key="thumb-backdrop"
            type="button"
            aria-label={t('nav.closeMenu')}
            className="pointer-events-auto fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
          />
        )}
      </AnimatePresence>

      <div className="pointer-events-auto relative z-[60] flex flex-col items-end gap-3">
        <AnimatePresence>
          {open && (
            <motion.nav
              key="thumb-menu"
              aria-label="Main navigation"
              className="mb-1 flex flex-col items-end gap-2.5"
              initial="closed"
              animate="open"
              exit="closed"
              variants={{
                open: {
                  transition: { staggerChildren: 0.045, staggerDirection: -1 },
                },
                closed: {
                  transition: { staggerChildren: 0.03, staggerDirection: 1 },
                },
              }}
            >
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = item.match(pathname);

                return (
                  <motion.div
                    key={item.href}
                    variants={{
                      open: { opacity: 1, y: 0, scale: 1 },
                      closed: { opacity: 0, y: 12, scale: 0.92 },
                    }}
                    transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                  >
                    <Link
                      href={item.href}
                      onClick={close}
                      className={[
                        'group flex min-h-[48px] items-center gap-3 rounded-full border py-1.5 pl-3.5 pr-1.5',
                        'bg-surface-container-lowest/95 shadow-lg shadow-black/40 backdrop-blur-xl',
                        'transition-colors active:scale-[0.97]',
                        active
                          ? 'border-primary-container/40 text-primary-container'
                          : 'border-outline-variant/25 text-on-surface hover:border-primary-container/30',
                      ].join(' ')}
                    >
                      <span className="whitespace-nowrap pl-1 font-label-caps text-[11px] uppercase tracking-[0.12em]">
                        {t(item.labelKey)}
                      </span>
                      <span
                        className={[
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors',
                          active
                            ? 'bg-primary-container text-white'
                            : 'bg-surface-container-high text-primary group-hover:bg-primary-container/20',
                        ].join(' ')}
                      >
                        <Icon className="h-5 w-5" strokeWidth={2.25} />
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.nav>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
          aria-expanded={open}
          aria-haspopup="true"
          onClick={() => setOpen((v) => !v)}
          className={[
            'relative flex h-14 w-14 items-center justify-center rounded-full',
            'bg-primary-container text-white',
            'shadow-[0_8px_24px_rgba(200,75,36,0.35)]',
            'ring-2 ring-primary-container/25',
            'transition-shadow hover:shadow-[0_10px_28px_rgba(200,75,36,0.45)]',
            'active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary',
          ].join(' ')}
          whileTap={{ scale: 0.92 }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={open ? 'close' : 'open'}
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, rotate: -45, scale: 0.6 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 45, scale: 0.6 }}
              transition={{ duration: 0.18 }}
            >
              {open ? <X className="h-6 w-6" strokeWidth={2.5} /> : <Sparkles className="h-6 w-6" strokeWidth={2.25} />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}
