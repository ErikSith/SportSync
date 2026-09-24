'use client';

import { Suspense, useMemo } from 'react';
import type { EventCardData, ParticipationMode } from '@/lib/data/events';
import type { EventType } from '@/lib/constants/events';
import type { ProgramsFeedTab } from '@/lib/programs/classify';
import { EventFiltersBar } from '@/components/events/EventFiltersBar';
import { EventAtmosphereTab } from '@/components/events/EventAtmosphereTab';
import { useT } from '@/components/i18n/LocaleProvider';

const TEAL = '#2DD4BF';

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

function countLabel(n: number, tab: ProgramsFeedTab, t: ReturnType<typeof useT>): string {
  if (tab === 'camps') {
    if (n === 1) return t('programs.count.campOne', { n });
    return t('programs.count.camps', { n });
  }
  if (tab === 'courses') {
    if (n === 1) return t('programs.count.courseOne', { n });
    return t('programs.count.courses', { n });
  }
  if (n === 1) return t('programs.count.workshopOne', { n });
  return t('programs.count.workshops', { n });
}

function sectionCopy(tab: ProgramsFeedTab, t: ReturnType<typeof useT>): {
  title: string;
  sub: string;
} {
  if (tab === 'camps') {
    return { title: t('programs.listTitle.camps'), sub: t('programs.listSub.camps') };
  }
  if (tab === 'courses') {
    return { title: t('programs.listTitle.courses'), sub: t('programs.listSub.courses') };
  }
  return { title: t('programs.listTitle.workshops'), sub: t('programs.listSub.workshops') };
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
  const sorted = useMemo(
    () =>
      [...events].sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      ),
    [events],
  );
  const emptyIcon =
    tab === 'courses' ? 'menu_book' : tab === 'workshops' ? 'school' : 'camping';
  const section = sectionCopy(tab, t);

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

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-teal-400/20 bg-transparent px-5 py-10 text-center">
          <span
            className="material-symbols-outlined mb-3 text-[36px]"
            style={{ color: TEAL }}
            aria-hidden
          >
            {emptyIcon}
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
                  {section.title}
                </h2>
              </div>
              <p className="pl-8 font-body-md text-xs text-on-surface-variant">{section.sub}</p>
            </div>
            <span className="shrink-0 rounded-full border border-teal-400/30 bg-teal-400/10 px-2.5 py-1 font-label-caps text-[10px] uppercase tracking-wider text-teal-200">
              {countLabel(sorted.length, tab, t)}
            </span>
          </div>

          <div
            role="list"
            aria-label={section.title}
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5"
          >
            {sorted.map((event, index) => (
              <div key={event.id} role="listitem" className="min-w-0">
                <EventAtmosphereTab
                  event={event}
                  index={index}
                  layout="fill"
                  accent="programs"
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
