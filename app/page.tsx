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
import { activeFeedSinceIso } from '@/lib/retention/feed-window';
import { TopAppBar } from '@/components/home/TopAppBar';
import { QuickActions } from '@/components/home/QuickActions';
import { EventsInspirationSection } from '@/components/home/EventsInspirationSection';
import { LocationPrompt } from '@/components/home/LocationPrompt';
import { LockViewport } from '@/components/home/LockViewport';
import { HomeFeedFilterHydrator as PlayerFeedFilterHydrator, HomeFeedPreferencesAside } from '@/components/home/HomeFeedFilterButton';
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

function HomeFallback({ message }: { message?: string }) {
  return (
    <main className="pt-24 px-container-margin-mobile max-w-lg mx-auto text-center space-y-4">
      <h2 className="font-headline-md text-headline-md text-on-surface">SportSync</h2>
      <p className="font-body-md text-body-md text-tertiary-container">
        {message ?? 'We could not load the homepage feed right now. Please try again in a moment.'}
      </p>
      <Link href="/" className="inline-flex font-label-md text-primary underline-offset-4 hover:underline">
        Refresh
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
): Promise<HomepageEventInspiration | null> {
  try {
    const supabase = await createClient();

    // Prefer venue names; if the embed fails under RLS, retry bare select.
    let { data, error } = await supabase
      .from('events')
      .select('*, venues(name)')
      .in('status', ['open', 'live'])
      .gte('starts_at', activeFeedSinceIso())
      .order('starts_at', { ascending: true })
      .limit(120);

    if (error) {
      console.error('Homepage Supabase query error (with venues):', error);
      ({ data, error } = await supabase
        .from('events')
        .select('*')
        .in('status', ['open', 'live'])
        .gte('starts_at', activeFeedSinceIso())
        .order('starts_at', { ascending: true })
        .limit(120));
    }

    // Date floor emptied the feed — load all open/live regardless of starts_at.
    if (!error && (!data || data.length === 0)) {
      console.error('Homepage Supabase: 0 rows with date floor — retrying without starts_at filter');
      ({ data, error } = await supabase
        .from('events')
        .select('*')
        .in('status', ['open', 'live'])
        .order('starts_at', { ascending: true })
        .limit(120));
    }

    if (error) {
      console.error('Homepage Supabase query error:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.error('Homepage Supabase query returned 0 active events');
      return null;
    }

    return buildHomepageInspirationFromCards(mapRawEventRowsToCards(data, lat, lng), {
      lat,
      lng,
      usedAllEventsFallback: true,
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
    return <HomeFallback message="Authentication is temporarily unavailable. Please try again shortly." />;
  }

  if (viewer.status === 'setup') {
    return (
      <main className="pt-24 px-container-margin-mobile max-w-lg mx-auto text-center space-y-4">
        <h2 className="font-headline-md text-headline-md text-on-surface">Setting up your profile…</h2>
        <p className="font-body-md text-body-md text-tertiary-container">
          This only takes a second. Refresh the page to continue.
        </p>
      </main>
    );
  }

  const { profile } = viewer;

  const hasGps = profile.latitude !== null && profile.longitude !== null;
  const city = profile.city ?? 'Bratislava';
  const feedLat = profile.latitude ?? 48.1486;
  const feedLng = profile.longitude ?? 17.1077;
  const feedFilters = parseHomeFeedFilters(searchParams);
  let inspiration: HomepageEventInspiration | null = null;
  let filterVenues: HomeFilterVenue[] = [];

  try {
    // 1) Try location-aware inspiration when GPS exists (no HTTP — data layer uses createClient).
    if (hasGps) {
      try {
        inspiration = await getHomepageEventInspiration(profile, feedFilters);
      } catch (locationError) {
        console.error('Homepage location feed error:', locationError);
        inspiration = null;
      }
    }

    // 2) No GPS, or 20km / city filter returned nothing → all active events via createClient().
    if (!homepageInspirationHasEvents(inspiration)) {
      inspiration = await queryAllActiveEvents(feedLat, feedLng);
    }

    filterVenues = await getVenuesForHomeFilter(city);
  } catch (error) {
    console.error('Homepage data fetch error:', error);
    inspiration = await queryAllActiveEvents(feedLat, feedLng);
    filterVenues = [];
  }

  const displayName = profile.fullName ?? profile.username;

  return (
    <>
      <LockViewport />
      <TrackPageView
        page="home"
        extra={{
          city,
          hasLocation: String(hasGps),
          area: feedFilters.area,
          nearbyCount: String(inspiration?.nearby.length ?? 0),
          startingSoonCount: String(inspiration?.startingSoon.length ?? 0),
          lastSpotsCount: String(inspiration?.lastSpots.length ?? 0),
          feedFilters: String(activeHomeFeedFilterCount(feedFilters)),
        }}
      />
      <Suspense fallback={null}>
        <PlayerFeedFilterHydrator />
      </Suspense>
      <div className="ambient-glow-layer fixed inset-0" aria-hidden>
        <div className="ambient-glow bg-primary-container/10 w-[500px] h-[500px] top-0 left-[-200px]" />
        <div className="ambient-glow bg-secondary-container/5 w-[600px] h-[600px] bottom-[20%] right-[-100px]" />
      </div>

      <TopAppBar avatarUrl={profile.avatarUrl} name={displayName} />

      <main className="h-dvh max-h-dvh overflow-hidden overscroll-none pt-24 px-container-margin-mobile md:px-container-margin-desktop max-w-7xl mx-auto space-y-8 md:space-y-section-gap relative z-10 w-full min-w-0 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
        <section className="space-y-5 md:space-y-6">
          <header className="space-y-2 border-b border-white/5 pb-4">
            <div className="flex items-start justify-between gap-2.5">
              <div className="min-w-0 flex-1 space-y-2 pr-1">
                <p className="font-label-caps text-label-caps text-tertiary uppercase tracking-widest">Welcome Back</p>
                <h2 className="font-display-lg-mobile text-display-lg-mobile md:font-display-lg md:text-display-lg text-on-surface break-words">
                  {displayName}
                </h2>
              </div>
              <Suspense fallback={null}>
                <div className="shrink-0 pt-0.5">
                  <HomeFeedPreferencesAside venues={filterVenues} city={city} />
                </div>
              </Suspense>
            </div>
          </header>
          <QuickActions />
          <Link
            href="/demo"
            className="glass-panel rounded-xl p-3.5 sm:p-4 flex items-center justify-between gap-3 border border-secondary/20 hover:border-secondary/40 transition-colors group min-w-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="material-symbols-outlined text-secondary text-2xl shrink-0">preview</span>
              <div className="min-w-0">
                <p className="font-headline-md text-[16px] sm:text-[18px] text-on-surface truncate">Live Design Showcase</p>
                <p className="font-body-md text-xs sm:text-sm text-on-surface-variant line-clamp-2">Venue, Tournament, Event &amp; Lobby detail pages</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform shrink-0">arrow_forward</span>
          </Link>
        </section>

        {inspiration ? (
          <EventsInspirationSection data={inspiration} />
        ) : (
          <LocationPrompt />
        )}
      </main>

    </>
  );
}
