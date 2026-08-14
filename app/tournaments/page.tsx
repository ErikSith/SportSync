import { Suspense } from 'react';
import Link from 'next/link';
import { getPageViewer } from '@/lib/auth/viewer';
import { getVenuesForHomeFilter } from '@/lib/data/homepage';
import { type TournamentCardData } from '@/lib/data/tournaments';
import { getTournamentsForArea } from '@/lib/data/area-feed';
import { canCreateTournament } from '@/lib/auth/tournament-access';
import type { TournamentStatusFilter } from '@/components/tournaments/TournamentFilterChips';
import { TournamentsFeed } from '@/components/tournaments/TournamentsFeed';
import { PageTitleRow } from '@/components/shared/PageTitleRow';
import { BrandAppBar } from '@/components/shared/BrandAppBar';
import { PlayerFeedFilterHydrator } from '@/components/home/HomeFeedFilterButton';
import { applyPlayerFeedFilters, parseHomeFeedFilters } from '@/lib/home-feed-filters';
import { parseFeedArea, resolveFeedLocation } from '@/lib/cities';
import {
  applyEventDateRange,
  eventDayKeys,
  parseEventDateRange,
} from '@/lib/event-date-filter';

export const runtime = 'edge';

interface TournamentsPageProps {
  searchParams: {
    sport?: string;
    venues?: string;
    type?: string;
    status?: string;
    area?: string;
    from?: string;
    to?: string;
  };
}

function parseStatus(raw: string | undefined): TournamentStatusFilter {
  const v = raw?.toLowerCase();
  if (v === 'open') return 'open';
  if (v === 'live') return 'live';
  if (v === 'all') return 'ALL';
  return 'upcoming';
}

function matchesStatus(t: TournamentCardData, status: TournamentStatusFilter): boolean {
  if (status === 'ALL') return true;
  if (status === 'live') return t.status === 'IN_PROGRESS';
  if (status === 'open') return t.status === 'REGISTRATION_OPEN';
  return t.status === 'REGISTRATION_OPEN' || t.status === 'IN_PROGRESS';
}

export default async function TournamentsPage({ searchParams }: TournamentsPageProps) {
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
  const statusFilter = parseStatus(searchParams.status);
  const requestedArea = parseFeedArea(searchParams.area ?? feedFilters.area);
  const location = resolveFeedLocation({
    areaRaw: requestedArea,
    profileCity: profile.city,
    profileLat: profile.latitude,
    profileLng: profile.longitude,
  });

  const [filterVenues, rawTournaments] = await Promise.all([
    getVenuesForHomeFilter(city, 40),
    getTournamentsForArea({ location }),
  ]);

  const byFeed = applyPlayerFeedFilters(rawTournaments, feedFilters, {
    sport: (t) => t.sport,
    venueId: (t) => t.venueId,
  });
  const byStatus = byFeed.filter((t) => matchesStatus(t, statusFilter));
  const dateRange = parseEventDateRange({
    from: searchParams.from,
    to: searchParams.to,
  });
  const tournaments = applyEventDateRange(byStatus, dateRange, (t) => t.startsAt);
  const dayKeys = [...eventDayKeys(rawTournaments.map((t) => t.startsAt))];
  const dateFilterActive = Boolean(dateRange.from);
  const canCreate = canCreateTournament(profile.role);

  const emptyTitle = dateFilterActive
    ? 'V tieto dni žiadne cups.'
    : 'No tournaments match these filters.';
  const emptySubtitle = dateFilterActive
    ? 'Skús iný termín alebo zruš dátumový filter.'
    : 'Try another sport or status — new cups are added regularly.';

  return (
    <>
      <Suspense fallback={null}>
        <PlayerFeedFilterHydrator />
      </Suspense>

      <BrandAppBar accent="secondary" />

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="ambient-glow bg-secondary/10 h-[420px] w-[420px] left-[-160px] top-16" />
        <div className="ambient-glow bg-primary-container/5 h-[360px] w-[360px] right-[-120px] top-56" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-screen-xl min-w-0 flex-grow flex-col gap-4 px-container-margin-mobile pb-8 pt-5 md:px-container-margin-desktop md:gap-5">
        <PageTitleRow
          city={city}
          venues={filterVenues}
          title={
            <div className="space-y-1 min-w-0">
              <p className="font-label-caps text-[10px] uppercase tracking-[0.2em] text-secondary">
                Compete
              </p>
              <h1 className="font-headline-md text-[28px] leading-tight tracking-wide text-on-background sm:text-3xl md:text-4xl">
                Tournaments
              </h1>
            </div>
          }
          subtitle={
            <p className="mt-1 max-w-md font-body-md text-sm text-on-surface-variant md:text-body-md">
              Cups and brackets near you — entry fees, spots and venues at a glance.
            </p>
          }
          actions={
            canCreate ? (
              <Link
                href="/tournaments/create"
                className="inline-flex items-center gap-1.5 rounded-xl border border-secondary/40 bg-secondary/15 px-3 py-2 font-label-caps text-[10px] uppercase tracking-[0.12em] text-secondary transition-colors hover:bg-secondary/25 active:scale-[0.98]"
              >
                <span
                  className="material-symbols-outlined text-[16px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  emoji_events
                </span>
                Create cup
              </Link>
            ) : undefined
          }
        />

        <TournamentsFeed
          tournaments={tournaments}
          allTournaments={rawTournaments}
          statusFilter={statusFilter}
          selectedSports={feedFilters.sports}
          eventDayKeys={dayKeys}
          emptyTitle={emptyTitle}
          emptySubtitle={emptySubtitle}
        />
      </main>

    </>
  );
}
