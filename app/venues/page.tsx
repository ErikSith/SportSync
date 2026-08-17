import { Suspense } from 'react';
import Link from 'next/link';
import { getPageViewer } from '@/lib/auth/viewer';
import { getVenuesForHomeFilter } from '@/lib/data/homepage';
import { getVenuesForArea } from '@/lib/data/area-feed';
import { VenueCard } from '@/components/venues/VenueCard';
import { VenueFilterChips } from '@/components/venues/VenueFilterChips';
import { VenueDiscoveryMapClient } from '@/components/venues/VenueDiscoveryMapClient';
import { LocationPrompt } from '@/components/home/LocationPrompt';
import { PageTitleRow } from '@/components/shared/PageTitleRow';
import { PlayerFeedFilterHydrator } from '@/components/home/HomeFeedFilterButton';
import {
  matchesVenueFilter,
  matchesVenueSportsFilter,
  parseHomeFeedFilters,
} from '@/lib/home-feed-filters';
import { parseFeedArea, resolveFeedLocation } from '@/lib/cities';

export const runtime = 'edge';

interface VenuesPageProps {
  searchParams: { sport?: string; venues?: string; type?: string; area?: string };
}

export default async function VenuesPage({ searchParams }: VenuesPageProps) {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return (
      <main className="pt-24 px-container-margin-mobile max-w-lg mx-auto text-center">
        <p className="font-body-md text-body-md text-tertiary-container">Setting up your profile…</p>
      </main>
    );
  }

  const { profile } = viewer;

  const city = profile.city ?? 'Bratislava';
  const feedFilters = parseHomeFeedFilters(searchParams);
  const requestedArea = parseFeedArea(searchParams.area ?? feedFilters.area);
  const location = resolveFeedLocation({
    areaRaw: requestedArea,
    profileCity: profile.city,
    profileLat: profile.latitude,
    profileLng: profile.longitude,
  });
  const needsGpsPrompt =
    requestedArea === 'near_me' && (profile.latitude === null || profile.longitude === null);

  const [filterVenues, rawFeed] = await Promise.all([
    getVenuesForHomeFilter(city, 200),
    needsGpsPrompt
      ? Promise.resolve(null)
      : getVenuesForArea({ location }),
  ]);

  const allVenues = rawFeed?.venues ?? [];

  const filtered = allVenues.filter((v) => {
    if (!matchesVenueSportsFilter(v.sports, feedFilters)) return false;
    if (!matchesVenueFilter(v.id, feedFilters)) return false;
    return true;
  });

  const mappable = filtered.filter((v) => v.latitude != null && v.longitude != null);

  return (
    <>
      <Suspense fallback={null}>
        <PlayerFeedFilterHydrator />
      </Suspense>
      <header className="bg-[#121212]/90 backdrop-blur-xl fixed top-0 w-full z-50 border-b border-white/10 shadow-2xl shadow-black/40">
        <div className="flex justify-between items-center px-container-margin-mobile h-16 w-full max-w-screen-xl mx-auto">
          <span className="w-10 h-10" aria-hidden />
          <Link href="/" className="font-display-lg-mobile text-display-lg-mobile font-bold tracking-tighter gradient-text">
            SPORTSYNC
          </Link>
          <button type="button" className="text-[#FF5722] hover:opacity-80 active:scale-95 transition-all" aria-label="Notifications">
            <span className="material-symbols-outlined">notifications</span>
          </button>
        </div>
      </header>

      <main className="flex-grow max-w-screen-xl mx-auto w-full px-container-margin-mobile md:px-container-margin-desktop py-gutter flex flex-col gap-gutter pt-24 pb-8 bg-[#121212]">
        <PageTitleRow
          city={city}
          venues={filterVenues}
          title={
            <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface">
              Venues
            </h1>
          }
          subtitle={
            <p className="font-body-md text-body-md text-on-surface-variant mt-1 max-w-2xl">
              Map-first discovery — tap a pin for courts, cups, and official links.
            </p>
          }
        />

        {needsGpsPrompt ? (
          <LocationPrompt />
        ) : (
          <section className="flex flex-col gap-5">
            <Suspense
              fallback={<div className="h-14 rounded-xl bg-surface-container-high animate-pulse" />}
            >
              <VenueFilterChips
                selectedSports={feedFilters.sports}
              />
            </Suspense>

            {mappable.length > 0 ? (
              <VenueDiscoveryMapClient
                venues={filtered}
                userLocation={
                  profile.latitude != null && profile.longitude != null
                    ? { latitude: profile.latitude, longitude: profile.longitude }
                    : null
                }
              />
            ) : (
              <div className="rounded-2xl border border-[#FF5722]/25 bg-[#121212] p-8 text-center space-y-2">
                <span className="material-symbols-outlined text-[#FF5722] text-3xl">pin_drop</span>
                <p className="font-body-md text-body-md text-on-surface">
                  No GPS pins yet for this filter.
                </p>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Run Places discovery (`npm run discover:venues`) or clear filters.
                </p>
              </div>
            )}

            {rawFeed?.showExtended && filtered.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-outline-variant/30" />
                <span className="font-label-caps text-[10px] text-tertiary uppercase tracking-wider text-center">
                  {rawFeed.message}
                </span>
                <div className="h-px flex-1 bg-outline-variant/30" />
              </div>
            )}

            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-tertiary/20 bg-surface-container-high p-8 text-center space-y-3">
                <span className="material-symbols-outlined text-tertiary text-3xl">stadium</span>
                <p className="font-body-md text-body-md text-on-surface">No venues match these filters.</p>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Try another sport or clear filters.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <h2 className="font-label-caps text-[11px] uppercase tracking-[0.16em] text-[#FF5722]">
                  List
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((venue) => (
                    <VenueCard key={venue.id} venue={venue} />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </>
  );
}
