import Link from 'next/link';
import { Suspense } from 'react';
import { getPageViewer } from '@/lib/auth/viewer';
import type { EventFeedResult, ParticipationMode } from '@/lib/data/events';
import { t } from '@/lib/i18n/server';
import { SetupNotice } from '@/components/i18n/SetupNotice';
import { getAllActiveEventsFeedSafe } from '@/lib/data/fetch-active-events';
import { getEventsForArea } from '@/lib/data/area-feed';
import { canAccessManageHub } from '@/lib/auth/tournament-access';
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
import { parseEventsFeedTab } from '@/lib/feed/events-feed-tab';
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

interface EventsPageProps {
  searchParams: {
    sport?: string;
    venues?: string;
    type?: string;
    mode?: string;
    area?: string;
    from?: string;
    to?: string;
    discovery?: string;
    feed?: string;
    q?: string;
    audience?: string;
  };
}

function emptyStateMessage(
  type: EventType | 'ALL',
  mode: ParticipationMode,
): { title: string; subtitle: string } {
  if (mode === 'spectator') {
    return {
      title: t('events.empty.spectator.title'),
      subtitle: t('events.empty.spectator.sub'),
    };
  }
  if (type === 'official') {
    return {
      title: t('events.empty.official.title'),
      subtitle: t('events.empty.official.sub'),
    };
  }
  if (type === 'community') {
    return {
      title: t('events.empty.community.title'),
      subtitle: t('events.empty.community.sub'),
    };
  }
  return {
    title: t('events.empty.all.title'),
    subtitle: t('events.empty.all.sub'),
  };
}

function CreateEventActions({ isOrganizer }: { isOrganizer: boolean }) {
  if (!isOrganizer) return null;

  return (
    <Link
      href="/manage/events/create"
      className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/40 px-3 py-2 font-label-caps text-[10px] uppercase tracking-[0.12em] text-zinc-400 transition-colors hover:border-white/15 hover:bg-zinc-900/60 hover:text-zinc-200 active:scale-[0.98]"
    >
      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
        verified
      </span>
      {t('events.createOfficial')}
    </Link>
  );
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

/**
 * Load events via direct Supabase queries (no HTTP `/api/events`).
 * Missing GPS or empty 20km scope → all active events (incl. null coords).
 */
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
    console.error('Events page Supabase query error:', error);
    try {
      return await getAllActiveEventsFeedSafe({
        type: typeFilter,
        lat: location.lat,
        lng: location.lng,
      });
    } catch (fallbackError) {
      console.error('Events page fallback query error:', fallbackError);
      return emptyFeed();
    }
  }
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  let viewer;
  try {
    viewer = await getPageViewer();
  } catch (error) {
    console.error('Events page viewer error:', error);
    return (
      <main className="pt-24 px-container-margin-mobile max-w-lg mx-auto text-center">
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
  const feedTab = parseEventsFeedTab(searchParams.feed);
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
    console.error('Events page data fetch error:', error);
    rawFeed = await getAllActiveEventsFeedSafe({
      type: typeFilter,
      lat: location.lat,
      lng: location.lng,
    }).catch(() => emptyFeed());
  }

  // Area from DB → date → text search → hard sport/venue/type (chip filters must stick).
  const areaScoped = rawFeed.events;
  const dateRange = parseEventDateRange({
    from: searchParams.from,
    to: searchParams.to,
  });
  const dateScoped = applyEventDateRange(areaScoped, dateRange, (e) => e.startsAt);
  const query = (searchParams.q ?? '').trim().toLowerCase();
  const queryScoped = query
    ? dateScoped.filter((event) => {
        const haystack = `${event.title} ${event.sport} ${event.description ?? ''} ${event.venueName ?? ''}`.toLowerCase();
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
        : emptyStateMessage(typeFilter, mode);
  const isOrganizer = canAccessManageHub(profile.role);

  return (
    <>
      <TrackPageView page="events" extra={{ typeFilter, mode, area: location.area, needsGps: String(needsGpsPrompt) }} />
      <Suspense fallback={null}>
        <PlayerFeedFilterHydrator />
      </Suspense>
      <BrandAppBar accent="primary" />

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="ambient-glow bg-primary-container/10 h-[420px] w-[420px] left-[-160px] top-16" />
        <div className="ambient-glow bg-secondary-container/5 h-[360px] w-[360px] right-[-120px] top-56" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-screen-xl min-w-0 flex-grow flex-col gap-4 px-container-margin-mobile pb-8 pt-5 md:px-container-margin-desktop md:gap-5">
        <PageTitleRow
          title={
            <div className="space-y-1 min-w-0">
              <p className="font-label-caps text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                {t('events.eyebrow')}
              </p>
              <h1 className="font-headline-md text-[28px] leading-tight tracking-wide text-white sm:text-3xl md:text-4xl">
                {t('events.title')}
              </h1>
            </div>
          }
          subtitle={
            <p className="mt-1 max-w-md font-body-md text-sm text-zinc-400 md:text-body-md">
              {t('events.subtitle')}
            </p>
          }
          actions={<CreateEventActions isOrganizer={isOrganizer} />}
        />

        {needsGpsPrompt ? (
          <section className="flex flex-col gap-4">
            <LocationPrompt variant="inline" />
            {rawFeed.usedAllEventsFallback && events.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-outline-variant/15" />
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase text-center text-xs">
                  {t('home.allEventsFallback')}
                </span>
                <div className="h-px flex-1 bg-outline-variant/15" />
              </div>
            )}
            <EventsFeed
              events={events}
              allEvents={areaScoped}
              mode={mode}
              typeFilter={typeFilter}
              selectedSports={feedFilters.sports}
              eventDayKeys={dayKeys}
              feedTab={feedTab}
              emptyTitle={emptyState.title}
              emptySubtitle={emptyState.subtitle}
            />
          </section>
        ) : (
          <section className="flex flex-col gap-4">
            {location.allowExtended && (
              <GeoFallbackTracker showExtended={rawFeed.showExtended} radiusKm={rawFeed.radiusKm} />
            )}
            {(rawFeed.showExtended || rawFeed.usedAllEventsFallback) && events.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-outline-variant/15" />
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase text-center text-xs">
                  {t('home.allEventsFallback')}
                </span>
                <div className="h-px flex-1 bg-outline-variant/15" />
              </div>
            )}

            <EventsFeed
              events={events}
              allEvents={areaScoped}
              mode={mode}
              typeFilter={typeFilter}
              selectedSports={feedFilters.sports}
              eventDayKeys={dayKeys}
              feedTab={feedTab}
              emptyTitle={emptyState.title}
              emptySubtitle={emptyState.subtitle}
            />
          </section>
        )}
      </main>

    </>
  );
}
