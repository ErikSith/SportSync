'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useT } from '@/components/i18n/LocaleProvider';
import type { MessageKey } from '@/lib/i18n/messages';

/** Pure red — not Material orange (#FF5722). Hub tiles share one surface; accent is icon-only. */

type HubAccent = 'red' | 'gold' | 'sky' | 'teal' | 'mint' | 'sand';

const ACTIONS: Array<{
  href: string;
  labelKey: MessageKey;
  icon: string;
  hintKey?: MessageKey;
  accent: HubAccent;
}> = [
  {
    href: '/events',
    labelKey: 'home.quick.events',
    icon: 'celebration',
    hintKey: 'home.quick.eventsHint',
    accent: 'red',
  },
  {
    href: '/tournaments',
    labelKey: 'home.quick.tournaments',
    icon: 'emoji_events',
    hintKey: 'home.quick.tournamentsHint',
    accent: 'gold',
  },
  {
    href: '/skupinove-cvicenia',
    labelKey: 'home.quick.schedules',
    icon: 'fitness_center',
    hintKey: 'home.quick.schedulesHint',
    accent: 'sky',
  },
  {
    href: '/workshopy',
    labelKey: 'home.quick.programs',
    icon: 'school',
    hintKey: 'home.quick.programsHint',
    accent: 'teal',
  },
  {
    href: '/tabory',
    labelKey: 'home.quick.camps',
    icon: 'camping',
    hintKey: 'home.quick.campsHint',
    accent: 'mint',
  },
  {
    href: '/kruzky',
    labelKey: 'home.quick.courses',
    icon: 'menu_book',
    hintKey: 'home.quick.coursesHint',
    accent: 'sand',
  },
];

const ACCENT = {
  red: {
    hoverBorder: 'hover:border-[#E53935]/45',
    glow: 'bg-[#E53935]/12',
    ring: 'group-hover:ring-[#E53935]/40',
    icon: 'text-[#E53935]',
  },
  gold: {
    hoverBorder: 'hover:border-[#c4a035]/45',
    glow: 'bg-[#c4a035]/12',
    ring: 'group-hover:ring-[#c4a035]/40',
    icon: 'text-[#c4a035]',
  },
  sky: {
    hoverBorder: 'hover:border-[#8EB4C8]/40',
    glow: 'bg-[#8EB4C8]/12',
    ring: 'group-hover:ring-[#8EB4C8]/35',
    icon: 'text-[#8EB4C8]',
  },
  teal: {
    hoverBorder: 'hover:border-teal-400/45',
    glow: 'bg-teal-400/15',
    ring: 'group-hover:ring-teal-400/40',
    icon: 'text-teal-300',
  },
  mint: {
    hoverBorder: 'hover:border-emerald-400/40',
    glow: 'bg-emerald-400/12',
    ring: 'group-hover:ring-emerald-400/35',
    icon: 'text-emerald-300',
  },
  sand: {
    hoverBorder: 'hover:border-[#c4a882]/40',
    glow: 'bg-[#c4a882]/12',
    ring: 'group-hover:ring-[#c4a882]/35',
    icon: 'text-[#d4b896]',
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
      className="grid grid-cols-3 gap-2 sm:gap-2.5"
      aria-label={t('home.quickHub')}
    >
      {ACTIONS.map((action) => {
        const accent = ACCENT[action.accent];
        return (
          <motion.div key={action.href} variants={item}>
            <Link
              href={action.href}
              className={[
                'group relative flex min-h-[4.5rem] flex-col justify-between overflow-hidden rounded-xl',
                'border border-white/[0.06] bg-[#1F1F1F] p-2.5 sm:min-h-[5rem] sm:p-3',
                'transition duration-200 hover:bg-[#262626] active:scale-[0.98]',
                accent.hoverBorder,
              ].join(' ')}
            >
              <div
                className={`pointer-events-none absolute -right-5 -top-5 h-14 w-14 rounded-full opacity-0 blur-2xl transition-opacity group-hover:opacity-100 ${accent.glow}`}
                aria-hidden
              />
              <span
                className={[
                  'relative z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-[#121212] ring-1 ring-white/[0.06] transition sm:h-8 sm:w-8',
                  accent.ring,
                ].join(' ')}
                aria-hidden
              >
                <span className={`material-symbols-outlined text-[18px] sm:text-[20px] ${accent.icon}`}>
                  {action.icon}
                </span>
              </span>
              <div className="relative z-10 mt-2 min-w-0 space-y-0.5">
                <span className="block truncate font-headline-md text-[12px] font-semibold leading-tight text-on-surface transition-colors group-hover:text-white sm:text-[13px]">
                  {t(action.labelKey)}
                </span>
                {action.hintKey ? (
                  <span className="block truncate font-body-md text-[10px] leading-tight text-on-surface-variant/75">
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
