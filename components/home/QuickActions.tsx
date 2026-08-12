import Link from 'next/link';

const ACTIONS = [
  { href: '/lobby', label: 'Find Partners', icon: 'group', color: 'text-primary' },
  { href: '/tournaments', label: 'Tournaments', icon: 'emoji_events', color: 'text-secondary' },
  { href: '/events', label: 'Events', icon: 'event', color: 'text-primary' },
  {
    href: '/trainers',
    label: 'Trainers',
    icon: 'school',
    color: 'text-secondary',
    comingSoon: true,
  },
  { href: '/venues', label: 'Venues', icon: 'stadium', color: 'text-primary' },
  {
    href: '/leaderboard',
    label: 'Rankings',
    icon: 'leaderboard',
    color: 'text-secondary',
    comingSoon: true,
  },
] as const;

const cardClassName =
  'glass-card relative flex h-full min-h-[7.5rem] w-full flex-col items-start gap-2.5 overflow-hidden rounded-xl p-3 sm:min-h-[8.25rem] sm:gap-3 sm:p-4';

export function QuickActions() {
  return (
    <div className="grid auto-rows-fr grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
      {ACTIONS.map((action) => {
        const comingSoon = 'comingSoon' in action && action.comingSoon;

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
                {action.label}
              </span>
              <span
                className={[
                  'block min-h-[1rem] font-label-caps text-[8px] uppercase tracking-[0.14em] sm:text-[9px]',
                  comingSoon ? 'text-outline' : 'invisible',
                ].join(' ')}
                aria-hidden={!comingSoon}
              >
                Pripravuje sa
              </span>
            </div>
          </>
        );

        if (comingSoon) {
          return (
            <div
              key={action.href}
              aria-disabled="true"
              title="Pripravuje sa"
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
