'use client';

import Link from 'next/link';
import { useT } from '@/components/i18n/LocaleProvider';
import type { MessageKey } from '@/lib/i18n/messages';

const ACTIONS: Array<{
  href: string;
  labelKey: MessageKey;
  icon: string;
  color: string;
  comingSoon?: boolean;
}> = [
  { href: '/lobby', labelKey: 'home.quick.lobby', icon: 'group', color: 'text-primary' },
  {
    href: '/tournaments',
    labelKey: 'home.quick.tournaments',
    icon: 'emoji_events',
    color: 'text-secondary',
  },
  { href: '/events', labelKey: 'home.quick.events', icon: 'event', color: 'text-primary' },
  {
    href: '/trainers',
    labelKey: 'home.quick.trainers',
    icon: 'school',
    color: 'text-secondary',
    comingSoon: true,
  },
  { href: '/venues', labelKey: 'home.quick.venues', icon: 'stadium', color: 'text-primary' },
  {
    href: '/leaderboard',
    labelKey: 'home.quick.rankings',
    icon: 'leaderboard',
    color: 'text-secondary',
    comingSoon: true,
  },
];

const cardClassName =
  'glass-card relative flex h-full min-h-[7.5rem] w-full flex-col items-start gap-2.5 overflow-hidden rounded-xl p-3 sm:min-h-[8.25rem] sm:gap-3 sm:p-4';

export function QuickActions() {
  const t = useT();

  return (
    <div className="grid auto-rows-fr grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
      {ACTIONS.map((action) => {
        const comingSoon = Boolean(action.comingSoon);

        const body = (
          <>
            <div
              className={[
                'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-surface-container shadow-inner sm:h-10 sm:w-10',
                comingSoon
                  ? 'border-outline-variant/25'
                  : 'border-transparent transition-all group-hover:border-secondary/30 group-hover:bg-primary-container/20',
              ].join(' ')}
            >
              <span
                className={[
                  'material-symbols-outlined text-[22px] sm:text-[24px]',
                  action.color,
                  comingSoon ? 'opacity-70' : 'transition-all',
                ].join(' ')}
              >
                {action.icon}
              </span>
            </div>
            <div className="relative z-10 mt-auto min-w-0 w-full space-y-1">
              <span
                className={[
                  'block truncate font-headline-md text-[13px] font-semibold sm:text-body-md',
                  comingSoon
                    ? 'text-on-surface-variant'
                    : 'text-on-surface transition-colors group-hover:text-secondary',
                ].join(' ')}
              >
                {t(action.labelKey)}
              </span>
              <span
                className={[
                  'block min-h-[1rem] font-label-caps text-[8px] uppercase tracking-[0.14em] sm:text-[9px]',
                  comingSoon ? 'text-outline' : 'invisible',
                ].join(' ')}
                aria-hidden={!comingSoon}
              >
                {t('common.comingSoon')}
              </span>
            </div>
          </>
        );

        if (comingSoon) {
          return (
            <div
              key={action.href}
              aria-disabled="true"
              title={t('common.comingSoon')}
              className={`${cardClassName} cursor-not-allowed opacity-55`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-outline-variant/10 to-transparent" />
              {body}
            </div>
          );
        }

        return (
          <Link key={action.href} href={action.href} className={`${cardClassName} group`}>
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            {body}
          </Link>
        );
      })}
    </div>
  );
}
