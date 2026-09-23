import Link from 'next/link';
import { Suspense } from 'react';
import { getPageViewer } from '@/lib/auth/viewer';
import { createClient } from '@/lib/supabase/server';
import {
  buildHomepageInspirationFromCards,
  getHomepageEventInspiration,
  getVenuesForHomeFilter,
  homepageInspirationHasEvents,
  mapRawEventRowsToCards,
  type HomeFilterVenue,
  type HomepageEventInspiration,
} from '@/lib/data/homepage';
import {
  getLobbyPageFeed,
  joinableOpenLobbies,
  type LobbyCardData,
} from '@/lib/data/lobbies';
import { getActivePromotedBanners } from '@/lib/data/promoted';
import type { PromotedBannerItem } from '@/lib/data/promoted-types';
import { activeFeedSinceIso } from '@/lib/retention/feed-window';
import { t } from '@/lib/i18n/server';
import { SetupNotice } from '@/components/i18n/SetupNotice';
import { TopAppBar } from '@/components/home/TopAppBar';
import { CockpitHeader } from '@/components/home/CockpitHeader';
import { QuickActions } from '@/components/home/QuickActions';
import { FeaturedShowcaseCarousel } from '@/components/home/FeaturedShowcaseCarousel';
import { EventsInspirationSection } from '@/components/home/EventsInspirationSection';
import { OpenLobbiesList } from '@/components/home/OpenLobbiesList';
import { CockpitDisclaimer } from '@/components/home/CockpitDisclaimer';
import { LocationPrompt } from '@/components/home/LocationPrompt';
import { HomeFeedFilterHydrator as PlayerFeedFilterHydrator } from '@/components/home/HomeFeedFilterButton';
import { TrackPageView } from '@/components/telemetry/TrackPageView';
import { parseHomeFeedFilters, activeHomeFeedFilterCount } from '@/lib/home-feed-filters';

export const runtime = 'edge';

interface HomePageProps {
  searchParams: {
    sport?: string;
    venues?: string;
    type?: string;
    area?: string;
    discovery?: string;
  };
}

function isNextNavigationError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof (error as { digest?: unknown }).digest === 'string' &&
    ((error as { digest: string }).digest.startsWith('NEXT_REDIRECT') ||
      (error as { digest: string }).digest.startsWith('NEXT_NOT_FOUND'))
  );
}

function pickHomeOpenLobbies(lobbies: LobbyCardData[]): LobbyCardData[] {
  return joinableOpenLobbies(lobbies).sort(
    (a, b) =>
      a.scheduledAt.getTime() - b.scheduledAt.getTime() ||
      a.distanceKm - b.distanceKm ||
      b.spotsTotal - b.spotsFilled - (a.spotsTotal - a.spotsFilled),
  );
}

async function loadHomeOpenLobbies(input: {
  hasGps: boolean;
  profileId: string;
  lat: number;
  lng: number;
  city: string;
}): Promise<LobbyCardData[]> {
  try {
    // Identical source as `/lobby` so sport chips/counts stay in sync.
    const feed = await getLobbyPageFeed({
      profileId: input.profileId,
      city: input.city,
      lat: input.hasGps ? input.lat : null,
      lng: input.hasGps ? input.lng : null,
    });
    return pickHomeOpenLobbies(feed);
  } catch (err) {
    console.error('Homepage open lobbies error:', err);
    return [];
  }
}

function HomeFallback({ message }: { message?: string }) {
  return (
    <main className="mx-auto max-w-lg space-y-4 px-container-margin-mobile pt-24 text-center">
      <h2 className="font-headline-md text-headline-md text-on-surface">SportSync</h2>
      <p className="font-body-md text-body-md text-tertiary-container">
        {message ?? t('home.loadError')}
      </p>
      <Link href="/" className="inline-flex font-label-md text-primary underline-offset-4 hover:underline">
        {t('common.refresh')}
      </Link>
    </main>
  );
}

/**
 * Direct Supabase query via createClient() — never fetch('/api/events').
 * Returns all active open/live events across cities (null lat/lng included).
 * On error: logs and returns null (empty fallback).
 */
async function queryAllActiveEvents(
  lat: number,
  lng: number,
  favorites?: {
    followedVenueIds: string[];
    isGuest: boolean;
  },
): Promise<HomepageEventInspiration | null> {
  try {
    const supabase = await createClient();

    let { data, error } = await supabase
      .from('events')
      .select('*, venues(name)')
      .in('status', ['open', 'live'])
      .gte('starts_at', activeFeedSinceIso())
      .order('starts_at', { ascending: true })
      .limit(400);

    if (error) {
      console.error('Homepage Supabase query error (with venues):', error);
      ({ data, error } = await supabase
        .from('events')
        .select('*')
        .in('status', ['open', 'live'])
        .gte('starts_at', activeFeedSinceIso())
        .order('starts_at', { ascending: true })
        .limit(400));
    }

    if (!error && (!data || data.length === 0)) {
      console.error('Homepage Supabase: 0 rows with date floor — retrying without starts_at filter');
      ({ data, error } = await supabase
        .from('events')
        .select('*')
        .in('status', ['open', 'live'])
        .order('starts_at', { ascending: true })
        .limit(400));
    }

    if (error) {
      console.error('Homepage Supabase query error:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.error('Homepage Supabase query returned 0 active events');
      return null;
    }

    const followedVenueIds = favorites?.followedVenueIds ?? [];
    return buildHomepageInspirationFromCards(mapRawEventRowsToCards(data, lat, lng), {
      lat,
      lng,
      usedAllEventsFallback: true,
      followedVenueIds,
      isGuest: favorites?.isGuest ?? true,
    });
  } catch (error) {
    console.error('Homepage Supabase query error:', error);
    return null;
  }
}

export default async function HomePage({ searchParams }: HomePageProps) {
  let viewer;
  try {
    viewer = await getPageViewer();
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    console.error('Homepage viewer error:', error);
    return <HomeFallback message={t('home.authUnavailable')} />;
  }

  if (viewer.status === 'setup') {
    return <SetupNotice />;
  }

  const { profile, isGuest } = viewer;

  const hasGps = profile.latitude !== null && profile.longitude !== null;
  const city = profile.city ?? 'Bratislava';
  const feedLat = profile.latitude ?? 48.1486;
  const feedLng = profile.longitude ?? 17.1077;
  const feedFilters = parseHomeFeedFilters(searchParams);
  const favoritesOpts = { isGuest };

  let inspiration: HomepageEventInspiration | null = null;
  let promoted: PromotedBannerItem[] = [];
  let venues: HomeFilterVenue[] = [];
  let openLobbies: LobbyCardData[] = [];

  try {
    const [inspirationResult, promotedResult, filterVenues, lobbyResult] = await Promise.all([
      (async () => {
        let next: HomepageEventInspiration | null = null;
        if (hasGps) {
          try {
            next = await getHomepageEventInspiration(profile, feedFilters, favoritesOpts);
          } catch (locationError) {
            console.error('Homepage location feed error:', locationError);
            next = null;
          }
        }
        if (!homepageInspirationHasEvents(next)) {
          next = await getHomepageEventInspiration(profile, feedFilters, favoritesOpts);
        }
        if (!homepageInspirationHasEvents(next)) {
          next = await queryAllActiveEvents(feedLat, feedLng, {
            followedVenueIds: [],
            isGuest,
          });
        }
        return next;
      })(),
      getActivePromotedBanners().catch((err) => {
        console.error('Homepage promoted banners error:', err);
        return [] as PromotedBannerItem[];
      }),
      getVenuesForHomeFilter(city).catch(() => [] as HomeFilterVenue[]),
      loadHomeOpenLobbies({
        hasGps,
        profileId: profile.id,
        lat: feedLat,
        lng: feedLng,
        city,
      }),
    ]);

    inspiration = inspirationResult;
    promoted = promotedResult;
    venues = filterVenues;
    openLobbies = lobbyResult;
  } catch (error) {
    console.error('Homepage data fetch error:', error);
    inspiration = await getHomepageEventInspiration(profile, feedFilters, favoritesOpts);
    openLobbies = await loadHomeOpenLobbies({
      hasGps,
      profileId: profile.id,
      lat: feedLat,
      lng: feedLng,
      city,
    });
  }

  const displayName = profile.fullName ?? profile.username;

  return (
    <>
      <TrackPageView
        page="home"
        extra={{
          city,
          hasLocation: String(hasGps),
          area: feedFilters.area,
          nearbyCount: String(inspiration?.nearby.length ?? 0),
          startingSoonCount: String(inspiration?.startingSoon.length ?? 0),
          lastSpotsCount: String(inspiration?.lastSpots.length ?? 0),
          openLobbiesCount: String(openLobbies.length),
          feedFilters: String(activeHomeFeedFilterCount(feedFilters)),
          promotedCount: String(promoted.length),
        }}
      />
      <Suspense fallback={null}>
        <PlayerFeedFilterHydrator />
      </Suspense>

      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute left-[-180px] top-0 h-[420px] w-[420px] rounded-full bg-[#FF5722]/[0.07] blur-3xl" />
        <div className="absolute bottom-[15%] right-[-120px] h-[380px] w-[380px] rounded-full bg-[#FF5722]/[0.04] blur-3xl" />
      </div>

      <TopAppBar avatarUrl={profile.avatarUrl} name={displayName} />

      <main className="relative z-10 mx-auto w-full min-w-0 max-w-7xl space-y-5 bg-[#121212] px-container-margin-mobile pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] pt-20 md:space-y-7 md:px-container-margin-desktop">
        <CockpitHeader displayName={displayName} city={city} venues={venues} />

        <FeaturedShowcaseCarousel items={promoted} />

        <section className="space-y-3">
          <h2 className="font-label-caps text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
            {t('home.quickHub')}
          </h2>
          <QuickActions />
        </section>

        {inspiration ? (
          <EventsInspirationSection data={inspiration} openLobbies={openLobbies} />
        ) : (
          <>
            <OpenLobbiesList lobbies={openLobbies} />
            <LocationPrompt />
          </>
        )}

        <CockpitDisclaimer />
      </main>
    </>
  );
}
