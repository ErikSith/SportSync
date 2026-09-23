'use client';

import type { HomepageEventInspiration } from '@/lib/data/homepage';
import { isProgramEvent } from '@/lib/programs/classify';
import { StartingSoonSection } from '@/components/home/StartingSoonSection';
import { NearYouList } from '@/components/home/NearYouList';
import { GroupedProgramsSection } from '@/components/home/GroupedProgramsSection';
import { EventInspirationRow } from '@/components/home/EventInspirationRow';
import { useT } from '@/components/i18n/LocaleProvider';

interface EventsInspirationSectionProps {
  data: HomepageEventInspiration;
}

export function EventsInspirationSection({ data }: EventsInspirationSectionProps) {
  const t = useT();
  const { startingSoon, nearby, lastSpots, usedAllEventsFallback } = data;

  const programPool = [...startingSoon, ...nearby, ...lastSpots];
  const startingSoonEvents = startingSoon.filter((event) => !isProgramEvent(event));
  const nearbyEvents = nearby.filter((event) => !isProgramEvent(event));
  const lastSpotsEvents = lastSpots.filter((event) => !isProgramEvent(event));
  const hasAny =
    startingSoonEvents.length > 0 ||
    nearbyEvents.length > 0 ||
    lastSpotsEvents.length > 0 ||
    programPool.some((event) => isProgramEvent(event));

  if (!hasAny) return null;

  return (
    <section className="space-y-8">
      {usedAllEventsFallback ? (
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-outline-variant/15" />
          <span className="text-center font-label-caps text-xs uppercase text-on-surface-variant">
            {t('home.allEventsFallback')}
          </span>
          <div className="h-px flex-1 bg-outline-variant/15" />
        </div>
      ) : null}

      <StartingSoonSection
        events={startingSoonEvents}
        title={t('home.nextForYou')}
        subtitle={t('home.nextForYouSub')}
      />

      <NearYouList events={nearbyEvents} />

      <GroupedProgramsSection events={programPool} />

      {lastSpotsEvents.length > 0 ? (
        <EventInspirationRow
          icon="warning"
          title={t('home.lastSpots')}
          subtitle={t('home.lastSpotsSub')}
          events={lastSpotsEvents}
          badgeKind="lastSpots"
        />
      ) : null}
    </section>
  );
}
