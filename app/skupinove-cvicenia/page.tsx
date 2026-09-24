import { Suspense } from 'react';
import { getPageViewer } from '@/lib/auth/viewer';
import type { EventFeedResult, ParticipationMode } from '@/lib/data/events';
import { t } from '@/lib/i18n/server';
import { SetupNotice } from '@/components/i18n/SetupNotice';
import { getAllActiveEventsFeedSafe } from '@/lib/data/fetch-active-events';
import { getEventsForArea } from '@/lib/data/area-feed';
import type { EventType } from '@/lib/constants/events';
import { LocationPrompt } from '@/components/home/LocationPrompt';
import { TrackPageView } from '@/components/telemetry/TrackPageView';
import { GeoFallbackTracker } from '@/components/telemetry/GeoFallbackTracker';
import { PageTitleRow } from '@/components/shared/PageTitleRow';
import { BrandAppBar } from '@/components/shared/BrandAppBar';
import { PlayerFeedFilterHydrator } from '@/components/home/HomeFeedFilterButton';
import { applyPlayerFeedFilters, parseHomeFeedFilters } from '@/lib/home-feed-filters';
import { parseFeedArea, resolveFeedLocation } from '@/lib/cities';
import { EventsFeed } from '@/components/events/EventsFeed';
import {
  applyEventAudienceFilter,
  eventAudienceLabel,
  parseEventAudience,
} from '@/lib/event-audience-filter';
import {
  applyEventDateRange,
  eventDayKeys,
  parseEventDateRange,
} from '@/lib/event-date-filter';

export const runtime = 'edge';

interface SchedulesPageProps {
  searchParams: {
    sport?: string;
    venues?: string;
    type?: string;
    mode?: string;
    area?: string;
    from?: string;
    to?: string;
    q?: string;
    audience?: string;
  };
}

function parseMode(raw: string | undefined): ParticipationMode {
  return raw === 'spectator' ? 'spectator' : 'participate';
}

const EMPTY_FEED_BASE = {
  events: [] as EventFeedResult['events'],
  radiusKm: 0,
  showExtended: true,
  usedAllEventsFallback: true,
};

function emptyFeed(): EventFeedResult {
  return {
    ...EMPTY_FEED_BASE,
    message: t('home.allEventsFallback'),
  };
}

async function loadEventsFeed(input: {
  hasGps: boolean;
  needsGpsPrompt: boolean;
  location: ReturnType<typeof resolveFeedLocation>;
  typeFilter: EventType | 'ALL';
}): Promise<EventFeedResult> {
  const { hasGps, needsGpsPrompt, location, typeFilter } = input;

  try {
    if (!hasGps || needsGpsPrompt) {
      return await getAllActiveEventsFeedSafe({
        type: typeFilter,
        lat: location.lat,
        lng: location.lng,
      });
    }

    const scoped = await getEventsForArea({
      location,
      type: typeFilter,
    });

    if (scoped.events.length > 0) return scoped;

    return await getAllActiveEventsFeedSafe({
      type: typeFilter,
      lat: location.lat,
      lng: location.lng,
    });
  } catch (error) {
    console.error('Schedules page Supabase query error:', error);
    try {
      return await getAllActiveEventsFeedSafe({
        type: typeFilter,
        lat: location.lat,
        lng: location.lng,
      });
    } catch (fallbackError) {
      console.error('Schedules page fallback query error:', fallbackError);
      return emptyFeed();
    }
  }
}

export default async function SkupinoveCviceniaPage({ searchParams }: SchedulesPageProps) {
  let viewer;
  try {
    viewer = await getPageViewer();
  } catch (error) {
    console.error('Schedules page viewer error:', error);
    return (
      <main className="mx-auto max-w-lg px-container-margin-mobile pt-24 text-center">
        <p className="font-body-md text-body-md text-tertiary-container">
          {t('events.loadError')}
        </p>
      </main>
    );
  }

  if (viewer.status === 'setup') {
    return <SetupNotice />;
  }

  const { profile } = viewer;

  const hasGps = profile.latitude !== null && profile.longitude !== null;
  const feedFilters = parseHomeFeedFilters(searchParams);
  const typeFilter = feedFilters.type;
  const mode = parseMode(searchParams.mode);
  const requestedArea = parseFeedArea(searchParams.area ?? feedFilters.area);
  const location = resolveFeedLocation({
    areaRaw: requestedArea,
    profileCity: profile.city,
    profileLat: profile.latitude,
    profileLng: profile.longitude,
  });
  const needsGpsPrompt =
    requestedArea === 'near_me' && (profile.latitude === null || profile.longitude === null);

  let rawFeed: EventFeedResult = emptyFeed();

  try {
    rawFeed = await loadEventsFeed({ hasGps, needsGpsPrompt, location, typeFilter });
  } catch (error) {
    console.error('Schedules page data fetch error:', error);
    rawFeed = await getAllActiveEventsFeedSafe({
      type: typeFilter,
      lat: location.lat,
      lng: location.lng,
    }).catch(() => emptyFeed());
  }

  const areaScoped = rawFeed.events;
  const dateRange = parseEventDateRange({
    from: searchParams.from,
    to: searchParams.to,
  });
  const dateScoped = applyEventDateRange(areaScoped, dateRange, (e) => e.startsAt);
  const query = (searchParams.q ?? '').trim().toLowerCase();
  const queryScoped = query
    ? dateScoped.filter((event) => {
        const haystack =
          `${event.title} ${event.sport} ${event.description ?? ''} ${event.venueName ?? ''}`.toLowerCase();
        return haystack.includes(query);
      })
    : dateScoped;
  const audience = parseEventAudience(searchParams.audience);
  const audienceScoped = applyEventAudienceFilter(queryScoped, audience, (event) => event);
  const events = applyPlayerFeedFilters(audienceScoped, feedFilters, {
    sport: (e) => e.sport,
    venueId: (e) => e.venueId,
    type: (e) => e.type,
  });
  const dayKeys = [...eventDayKeys(areaScoped.map((e) => e.startsAt))];
  const dateFilterActive = Boolean(dateRange.from);
  const queryFilterActive = query.length > 0;
  const sportFilterActive = feedFilters.sports.length > 0;
  const audienceFilterActive = audience !== 'all';

  const emptyState = dateFilterActive
    ? {
        title: 'V tieto dni nič v okolí.',
        subtitle: 'Skús iný termín alebo zruš dátumový filter.',
      }
    : audienceFilterActive
      ? {
          title: `Žiadne eventy pre „${eventAudienceLabel(audience)}“.`,
          subtitle: 'Skús iný filter publika alebo zruš výber.',
        }
      : queryFilterActive
        ? {
            title: `Nič pre „${searchParams.q?.trim()}“.`,
            subtitle: 'Skús iný názov športu alebo zruš Other filter.',
          }
        : sportFilterActive
          ? {
              title: 'Žiadne eventy pre vybraný šport.',
              subtitle: 'Skús iný šport alebo zruš filter.',
            }
          : {
              title: t('events.empty.schedulesTitle'),
              subtitle: t('events.empty.schedulesSub'),
            };

  return (
    <>
      <TrackPageView
        page="skupinove-cvicenia"
        extra={{ typeFilter, mode, area: location.area, needsGps: String(needsGpsPrompt) }}
      />
      <Suspense fallback={null}>
        <PlayerFeedFilterHydrator />
      </Suspense>
      <BrandAppBar accent="schedules" />

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#121518]" aria-hidden>
        <div className="ambient-glow left-[-160px] top-16 h-[420px] w-[420px] bg-[#8EB4C8]/[0.04]" />
        <div className="ambient-glow right-[-120px] top-56 h-[360px] w-[360px] bg-slate-400/[0.02]" />
      </div>

      <main className="relative z-10 mx-auto flex w-full min-w-0 max-w-screen-xl flex-grow flex-col gap-4 bg-[#121518] px-container-margin-mobile pb-8 pt-5 md:gap-5 md:px-container-margin-desktop">
        <PageTitleRow
          title={
            <div className="min-w-0 space-y-1">
              <p className="font-label-caps text-[10px] uppercase tracking-[0.2em] text-[#8EB4C8]">
                {t('home.quick.schedulesHint')}
              </p>
              <h1 className="font-headline-md text-[28px] leading-tight tracking-wide text-on-background sm:text-3xl md:text-4xl">
                {t('events.tab.schedules')}
              </h1>
            </div>
          }
          subtitle={
            <p className="mt-1 max-w-md font-body-md text-sm text-on-surface-variant md:text-body-md">
              {t('events.schedulesSub')}
            </p>
          }
        />

        {needsGpsPrompt ? (
          <section className="flex flex-col gap-4">
            <LocationPrompt variant="inline" />
            {rawFeed.usedAllEventsFallback && events.length > 0 ? (
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-outline-variant/15" />
                <span className="text-center font-label-caps text-xs uppercase text-on-surface-variant">
                  {t('home.allEventsFallback')}
                </span>
                <div className="h-px flex-1 bg-outline-variant/15" />
              </div>
            ) : null}
            <EventsFeed
              events={events}
              allEvents={areaScoped}
              mode={mode}
              typeFilter={typeFilter}
              selectedSports={feedFilters.sports}
              eventDayKeys={dayKeys}
              feedTab="schedules"
              emptyTitle={emptyState.title}
              emptySubtitle={emptyState.subtitle}
            />
          </section>
        ) : (
          <section className="flex flex-col gap-4">
            {location.allowExtended ? (
              <GeoFallbackTracker showExtended={rawFeed.showExtended} radiusKm={rawFeed.radiusKm} />
            ) : null}
            {(rawFeed.showExtended || rawFeed.usedAllEventsFallback) && events.length > 0 ? (
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-outline-variant/15" />
                <span className="text-center font-label-caps text-xs uppercase text-on-surface-variant">
                  {t('home.allEventsFallback')}
                </span>
                <div className="h-px flex-1 bg-outline-variant/15" />
              </div>
            ) : null}
            <EventsFeed
              events={events}
              allEvents={areaScoped}
              mode={mode}
              typeFilter={typeFilter}
              selectedSports={feedFilters.sports}
              eventDayKeys={dayKeys}
              feedTab="schedules"
              emptyTitle={emptyState.title}
              emptySubtitle={emptyState.subtitle}
            />
          </section>
        )}
      </main>
    </>
  );
}
