import { Suspense, type ReactNode } from 'react';
import type { HomeFilterVenue } from '@/lib/data/homepage';
import { PlayerPreferencesAside } from '@/components/home/HomeFeedFilterButton';

interface PageTitleRowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  city?: string;
  venues?: HomeFilterVenue[];
  /** Location chip — used on Find Partners / Lobby. Hidden on Home, Events, Tournaments. */
  showPreferences?: boolean;
  preferencesVariant?: 'pill' | 'minimal';
}

/**
 * Mobile-first feed header:
 * Row 1 — title left, optional location chip right
 * Row 2 — subtitle full width
 * Row 3 — optional actions
 */
export function PageTitleRow({
  title,
  subtitle,
  actions,
  city = 'Bratislava',
  venues = [],
  showPreferences = false,
  preferencesVariant = 'pill',
}: PageTitleRowProps) {
  return (
    <header className="space-y-2 border-b border-white/5 pb-4">
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1 pr-1">{title}</div>
        {showPreferences ? (
          <Suspense fallback={null}>
            <div className="shrink-0 pt-0.5">
              <PlayerPreferencesAside venues={venues} city={city} variant={preferencesVariant} />
            </div>
          </Suspense>
        ) : null}
      </div>

      {subtitle ? <div className="min-w-0">{subtitle}</div> : null}

      {actions ? <div className="flex w-full flex-wrap items-center gap-2 pt-0.5">{actions}</div> : null}
    </header>
  );
}
