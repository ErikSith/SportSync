'use client';

import { Suspense, useCallback, useMemo, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { EventCardData, ParticipationMode } from '@/lib/data/events';
import type { EventType } from '@/lib/constants/events';
import type { ProgramsFeedTab } from '@/lib/programs/classify';
import { groupProgramsByVenue } from '@/lib/programs/group-by-venue';
import { EventFiltersBar } from '@/components/events/EventFiltersBar';
import { GroupedVenueProgramsCard } from '@/components/programs/GroupedVenueProgramsCard';
import { useT } from '@/components/i18n/LocaleProvider';

const TEAL = '#2DD4BF';

const TABS: Array<{
  key: ProgramsFeedTab;
  labelKey: 'programs.tab.workshops' | 'programs.tab.camps' | 'programs.tab.courses';
}> = [
  { key: 'workshops', labelKey: 'programs.tab.workshops' },
  { key: 'camps', labelKey: 'programs.tab.camps' },
  { key: 'courses', labelKey: 'programs.tab.courses' },
];

function ProgramsTabs({ active }: { active: ProgramsFeedTab }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const setTab = useCallback(
    (next: ProgramsFeedTab) => {
      if (next === active) return;
      const params = new URLSearchParams(searchParams.toString());
      if (next === 'workshops') params.delete('tab');
      else params.set('tab', next);
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [active, pathname, router, searchParams],
  );

  return (
    <div
      className={`relative w-full border-b border-teal-400/15 ${pending ? 'opacity-85' : ''}`}
      role="tablist"
      aria-label={t('programs.tab.aria')}
    >
      <div className="flex w-full">
        {TABS.map((tab) => {
          const selected = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(tab.key)}
              className={`relative flex flex-1 items-center justify-center px-2 py-3 font-label-caps text-[11px] uppercase tracking-[0.12em] transition-colors duration-200 sm:text-[12px] ${
                selected ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t(tab.labelKey)}
              {selected ? (
                <span
                  className="absolute inset-x-4 bottom-0 h-px sm:inset-x-8"
                  style={{ backgroundColor: TEAL }}
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface ProgramsFeedProps {
  events: EventCardData[];
  tab: ProgramsFeedTab;
  mode?: ParticipationMode;
  typeFilter?: EventType | 'ALL';
  selectedSports?: string[];
  eventDayKeys?: string[];
  emptyTitle: string;
  emptySubtitle: string;
}

export function ProgramsFeed({
  events,
  tab,
  mode = 'participate',
  typeFilter = 'ALL',
  selectedSports = [],
  eventDayKeys = [],
  emptyTitle,
  emptySubtitle,
}: ProgramsFeedProps) {
  const t = useT();
  const venueGroups = useMemo(() => groupProgramsByVenue(events), [events]);
  const expandFirst = venueGroups.length === 1;

  return (
    <div className="flex flex-col gap-5">
      <Suspense fallback={null}>
        <EventFiltersBar
          mode={mode}
          typeFilter={typeFilter}
          selectedSports={selectedSports}
          eventDayKeys={eventDayKeys}
          showMode={false}
          accent="teal"
        />
      </Suspense>

      <Suspense fallback={null}>
        <ProgramsTabs active={tab} />
      </Suspense>

      {events.length === 0 ? (
    <div className="rounded-2xl border border-teal-400/20 bg-transparent px-5 py-10 text-center">
          <span
            className="material-symbols-outlined mb-3 text-[36px]"
            style={{ color: TEAL }}
            aria-hidden
          >
            camping
          </span>
          <p className="font-headline-md text-[17px] text-white">{emptyTitle}</p>
          <p className="mt-1.5 font-body-md text-sm text-zinc-400">{emptySubtitle}</p>
        </div>
      ) : (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                <span className="h-1 w-6 rounded-full" style={{ backgroundColor: TEAL }} />
                <h2 className="font-headline-md text-[15px] tracking-wide text-on-background">
                  {t('programs.listTitle')}
                </h2>
              </div>
              <p className="pl-8 font-body-md text-xs text-on-surface-variant">
                {t('programs.listSub')}
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-teal-400/30 bg-teal-400/10 px-2.5 py-1 font-label-caps text-[10px] uppercase tracking-wider text-teal-200">
              {venueGroups.length}
            </span>
          </div>

          <div
            role="list"
            aria-label={t('programs.listTitle')}
            className="flex flex-col gap-2"
          >
            {venueGroups.map((group, index) => (
              <div key={group.key} role="listitem" className="min-w-0">
                <GroupedVenueProgramsCard
                  group={group}
                  tab={tab}
                  index={index}
                  defaultExpanded={expandFirst}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
