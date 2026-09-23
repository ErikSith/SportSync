'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useT } from '@/components/i18n/LocaleProvider';
import type { MessageKey } from '@/lib/i18n/messages';

type HubAccent = 'coral' | 'teal';

const ACTIONS: Array<{
  href: string;
  labelKey: MessageKey;
  icon: string;
  hintKey?: MessageKey;
  accent: HubAccent;
}> = [
  {
    href: '/lobby',
    labelKey: 'home.quick.lobby',
    icon: 'group',
    hintKey: 'home.quick.lobbyHint',
    accent: 'coral',
  },
  {
    href: '/tournaments',
    labelKey: 'home.quick.tournaments',
    icon: 'emoji_events',
    hintKey: 'home.quick.tournamentsHint',
    accent: 'coral',
  },
  {
    href: '/events',
    labelKey: 'home.quick.events',
    icon: 'event',
    hintKey: 'home.quick.eventsHint',
    accent: 'coral',
  },
  {
    href: '/programs',
    labelKey: 'home.quick.programs',
    icon: 'camping',
    hintKey: 'home.quick.programsHint',
    accent: 'teal',
  },
];

const ACCENT = {
  coral: {
    hoverBorder: 'hover:border-[#FF5722]/40',
    glow: 'bg-[#FF5722]/10',
    ring: 'group-hover:ring-[#FF5722]/35',
    icon: 'text-[#FF5722]',
  },
  teal: {
    hoverBorder: 'hover:border-teal-400/45',
    glow: 'bg-teal-400/15',
    ring: 'group-hover:ring-teal-400/40',
    icon: 'text-teal-300',
  },
} as const;

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' as const } },
};

export function QuickActions() {
  const t = useT();

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 gap-2.5 sm:gap-3"
      aria-label={t('home.quickHub')}
    >
      {ACTIONS.map((action) => {
        const accent = ACCENT[action.accent];
        return (
          <motion.div key={action.href} variants={item}>
            <Link
              href={action.href}
              className={[
                'group relative flex min-h-[5.75rem] flex-col justify-between overflow-hidden rounded-2xl',
                'border border-white/[0.06] bg-[#1F1F1F] p-3.5 sm:min-h-[6.5rem] sm:p-4',
                'transition duration-200 hover:bg-[#262626] active:scale-[0.98]',
                accent.hoverBorder,
              ].join(' ')}
            >
              <div
                className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl transition-opacity group-hover:opacity-100 ${accent.glow}`}
                aria-hidden
              />
              <span
                className={[
                  'relative z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-[#121212] ring-1 ring-white/[0.06] transition',
                  accent.ring,
                ].join(' ')}
                aria-hidden
              >
                <span className={`material-symbols-outlined text-[22px] ${accent.icon}`}>
                  {action.icon}
                </span>
              </span>
              <div className="relative z-10 mt-3 min-w-0 space-y-0.5">
                <span className="block truncate font-headline-md text-[14px] font-semibold text-on-surface transition-colors group-hover:text-white sm:text-[15px]">
                  {t(action.labelKey)}
                </span>
                {action.hintKey ? (
                  <span className="block truncate font-body-md text-[11px] text-on-surface-variant/80">
                    {t(action.hintKey)}
                  </span>
                ) : null}
              </div>
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
