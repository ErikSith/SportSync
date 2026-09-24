'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { THUMB_BUTTON_ENABLED } from '@/components/navigation/thumb-button-flags';
import { useT } from '@/components/i18n/LocaleProvider';
import type { MessageKey } from '@/lib/i18n/messages';

type NavItem = {
  href: string;
  labelKey: MessageKey;
  icon: string;
  match: (pathname: string) => boolean;
};

/**
 * Bottom → top when open (closest to thumb first).
 * Domov nearest FAB; Profil + Športoviská at the top of the stack.
 * Trainers / leaderboard hidden for now.
 */
const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    labelKey: 'nav.home',
    icon: 'home',
    match: (p) => p === '/',
  },
  // Lobby hidden for now — Eventy covers one-off actions.
  {
    href: '/events',
    labelKey: 'nav.events',
    icon: 'celebration',
    match: (p) => p === '/events' || p.startsWith('/events/'),
  },
  {
    href: '/tournaments',
    labelKey: 'nav.tournaments',
    icon: 'emoji_events',
    match: (p) => p === '/tournaments' || p.startsWith('/tournaments/'),
  },
  {
    href: '/programs',
    labelKey: 'nav.programs',
    icon: 'camping',
    match: (p) => p === '/programs' || p.startsWith('/programs/'),
  },
  {
    href: '/venues',
    labelKey: 'nav.venues',
    icon: 'location_on',
    match: (p) => p === '/venues' || p.startsWith('/venues/'),
  },
  {
    href: '/profile',
    labelKey: 'nav.profile',
    icon: 'person',
    match: (p) =>
      p === '/profile' ||
      p.startsWith('/profile/') ||
      p.startsWith('/players/') ||
      p === '/manage' ||
      p.startsWith('/manage/'),
  },
];

/** Render bottom→top in the column (reverse so first NAV item sits nearest FAB). */
const ROLLUP_ITEMS = [...NAV_ITEMS].reverse();

const HIDDEN_PREFIXES = ['/login', '/auth', '/b2b', '/demo', '/dev', '/beta'];

function hasFixedBottomCta(pathname: string) {
  return /^\/lobby\/[^/]+$/.test(pathname) || /^\/trainers\/[^/]+$/.test(pathname);
}

export function ThumbLauncher() {
  const pathname = usePathname();
  const t = useT();
  const menuId = useId();
  const rollupRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const hidden =
    !THUMB_BUTTON_ENABLED ||
    HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const liftForCta = hasFixedBottomCta(pathname);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  useEffect(() => {
    if (!open) return;
    const el = rollupRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open]);

  if (hidden) return null;

  const backdrop =
    mounted &&
    createPortal(
      <AnimatePresence>
        {open ? (
          <motion.button
            key="thumb-backdrop"
            type="button"
            aria-label={t('nav.closeMenu')}
            className="fixed inset-0 z-[80] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={close}
          />
        ) : null}
      </AnimatePresence>,
      document.body,
    );

  return (
    <>
      {backdrop}
      <div
        className={[
          'pointer-events-none fixed right-4 z-[82] flex flex-col items-end',
          'pr-[env(safe-area-inset-right,0px)] md:right-6',
          liftForCta
            ? 'bottom-[5.75rem] pb-[env(safe-area-inset-bottom,0px)]'
            : 'bottom-5 pb-[env(safe-area-inset-bottom,0px)] md:bottom-6',
        ].join(' ')}
      >
        <AnimatePresence>
          {open ? (
            <motion.nav
              key="thumb-rollup"
              ref={rollupRef}
              id={menuId}
              aria-label={t('nav.menuTitle')}
              className="mb-2.5 flex max-h-[min(62dvh,26rem)] flex-col items-end gap-1.5 overflow-y-auto overscroll-contain pr-0.5 hide-scrollbar"
              initial="closed"
              animate="open"
              exit="closed"
              variants={{
                open: {
                  transition: {
                    staggerChildren: 0.038,
                    delayChildren: 0.02,
                    staggerDirection: -1,
                  },
                },
                closed: {
                  transition: { staggerChildren: 0.022, staggerDirection: 1 },
                },
              }}
            >
              {ROLLUP_ITEMS.map((item) => {
                const active = item.match(pathname);
                return (
                  <motion.div
                    key={item.href}
                    variants={{
                      open: {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: { type: 'spring', stiffness: 520, damping: 30 },
                      },
                      closed: {
                        opacity: 0,
                        y: 16,
                        scale: 0.94,
                        transition: { duration: 0.12 },
                      },
                    }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => {
                        if (item.match(pathname)) close();
                      }}
                      className={[
                        'pointer-events-auto group flex min-h-[40px] items-center gap-2 rounded-full border py-1 pl-3 pr-1',
                        'bg-[#1c1b1b]/95 shadow-md shadow-black/40 backdrop-blur-md',
                        'transition-colors active:scale-[0.97]',
                        active
                          ? 'border-primary-container/45 text-on-surface'
                          : 'border-white/[0.08] text-on-surface hover:border-primary-container/30',
                      ].join(' ')}
                    >
                      <span className="whitespace-nowrap font-label-caps text-[10px] uppercase tracking-[0.1em]">
                        {t(item.labelKey)}
                      </span>
                      <span
                        className={[
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors',
                          active
                            ? 'bg-primary-container/90 text-white'
                            : 'bg-primary-container/15 text-primary-container group-hover:bg-primary-container/25',
                        ].join(' ')}
                        aria-hidden
                      >
                        <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.nav>
          ) : null}
        </AnimatePresence>

        <button
          type="button"
          aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
          aria-expanded={open}
          aria-controls={menuId}
          aria-haspopup="true"
          onClick={() => setOpen((v) => !v)}
          className={[
            'pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-[1.25rem]',
            'border border-primary-container/35 bg-[#1a1919]',
            'text-primary-container',
            'shadow-[0_6px_18px_rgba(0,0,0,0.45)]',
            'transition-[transform,border-color,background-color] active:scale-95',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary',
            open
              ? 'border-primary-container/55 bg-primary-container/20'
              : 'hover:border-primary-container/50 hover:bg-primary-container/10',
          ].join(' ')}
        >
          {/* Soft coral wash — sits behind the icon */}
          <span
            className="pointer-events-none absolute inset-0 rounded-[1.25rem] bg-primary-container/18"
            aria-hidden
          />
          <span
            className="pointer-events-none absolute inset-[3px] rounded-[1.05rem] bg-gradient-to-b from-primary-container/25 to-transparent"
            aria-hidden
          />
          <span className="relative material-symbols-outlined text-[26px] text-primary-fixed drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]" aria-hidden>
            {open ? 'close' : 'apps'}
          </span>
        </button>
      </div>
    </>
  );
}
