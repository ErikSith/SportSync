'use client';

import type { HomepageEventInspiration } from '@/lib/data/homepage';
import type { LobbyCardData } from '@/lib/data/lobbies';
import { isProgramEvent } from '@/lib/programs/classify';
import { StartingSoonSection } from '@/components/home/StartingSoonSection';
import { OpenLobbiesList } from '@/components/home/OpenLobbiesList';
import { GroupedProgramsSection } from '@/components/home/GroupedProgramsSection';
import { EventInspirationRow } from '@/components/home/EventInspirationRow';
import { useT } from '@/components/i18n/LocaleProvider';

interface EventsInspirationSectionProps {
  data: HomepageEventInspiration;
  openLobbies?: LobbyCardData[];
}

export function EventsInspirationSection({
  data,
  openLobbies = [],
}: EventsInspirationSectionProps) {
  const t = useT();
  const { startingSoon, nearby, lastSpots, usedAllEventsFallback, showFavoritesCta, favoritesCtaNeedsLogin } =
    data;

  const programPool = [...startingSoon, ...nearby, ...lastSpots];
  const startingSoonEvents = startingSoon.filter((event) => !isProgramEvent(event));
  const lastSpotsEvents = lastSpots.filter((event) => !isProgramEvent(event));
  const hasAny =
    showFavoritesCta ||
    data.followedVenueCount > 0 ||
    startingSoonEvents.length > 0 ||
    lastSpotsEvents.length > 0 ||
    openLobbies.length > 0 ||
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
        showFollowCta={showFavoritesCta}
        ctaNeedsLogin={favoritesCtaNeedsLogin}
        followedButEmpty={
          !showFavoritesCta && startingSoonEvents.length === 0 && data.followedVenueCount > 0
        }
      />

      {/* NearYou slot → active lobbies from /lobby feed */}
      <OpenLobbiesList lobbies={openLobbies} />

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
