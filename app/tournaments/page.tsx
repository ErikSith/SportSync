import { Suspense } from 'react';
import { t } from '@/lib/i18n/server';
import { SetupNotice } from '@/components/i18n/SetupNotice';
import Link from 'next/link';
import { getPageViewer } from '@/lib/auth/viewer';
import { type TournamentCardData } from '@/lib/data/tournaments';
import {
  applyTournamentParticipationFilter,
  mergeWatchOnlyCups,
} from '@/lib/tournament-participation';
import type { ParticipationMode } from '@/lib/data/events';
import { getEventsForArea, getTournamentsForArea } from '@/lib/data/area-feed';
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
import {
  applyEventAudienceFilter,
  eventAudienceLabel,
  parseEventAudience,
} from '@/lib/event-audience-filter';

export const runtime = 'edge';

interface TournamentsPageProps {
  searchParams: {
    sport?: string;
    venues?: string;
    type?: string;
    status?: string;
    mode?: string;
    area?: string;
    from?: string;
    to?: string;
    audience?: string;
  };
}

function parseStatus(raw: string | undefined): TournamentStatusFilter {
  const v = raw?.toLowerCase();
  if (v === 'open') return 'open';
  if (v === 'live') return 'live';
  if (v === 'all') return 'ALL';
  return 'upcoming';
}

function parseMode(raw: string | undefined): ParticipationMode {
  return raw === 'spectator' ? 'spectator' : 'participate';
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
    return <SetupNotice />;
  }

  const { profile } = viewer;

  const feedFilters = parseHomeFeedFilters(searchParams);
  const statusFilter = parseStatus(searchParams.status);
  const mode = parseMode(searchParams.mode);
  const requestedArea = parseFeedArea(searchParams.area ?? feedFilters.area);
  const location = resolveFeedLocation({
    areaRaw: requestedArea,
    profileCity: profile.city,
    profileLat: profile.latitude,
    profileLng: profile.longitude,
  });

  const [listedTournaments, spectatorFeed] = await Promise.all([
    getTournamentsForArea({ location }),
    getEventsForArea({ location, participationMode: 'spectator' }),
  ]);
  const rawTournaments = mergeWatchOnlyCups(listedTournaments, spectatorFeed.events);

  const byFeed = applyPlayerFeedFilters(rawTournaments, feedFilters, {
    sport: (t) => t.sport,
    venueId: (t) => t.venueId,
  });
  const byStatus = byFeed.filter((t) => matchesStatus(t, statusFilter));
  const byMode = applyTournamentParticipationFilter(byStatus, mode);
  const audience = parseEventAudience(searchParams.audience);
  const byAudience = applyEventAudienceFilter(byMode, audience, (t) => ({
    title: t.name,
    description: t.description,
    sourceUrl: t.sourceUrl ?? t.ticketUrl,
    forKids: t.forKids,
    forWomen: t.forWomen,
    venueName: t.venueName,
    sourceName: t.source,
  }));
  const dateRange = parseEventDateRange({
    from: searchParams.from,
    to: searchParams.to,
  });
  const tournaments = applyEventDateRange(byAudience, dateRange, (t) => t.startsAt);
  const dayKeys = [...eventDayKeys(rawTournaments.map((t) => t.startsAt))];
  const dateFilterActive = Boolean(dateRange.from);
  const audienceFilterActive = audience !== 'all';
  const canCreate = canCreateTournament(profile.role);

  const emptyTitle = dateFilterActive
    ? 'V tieto dni žiadne cups.'
    : audienceFilterActive
      ? `Žiadne cups pre „${eventAudienceLabel(audience)}“.`
      : mode === 'spectator'
        ? t('tournaments.empty.spectator.title')
        : t('tournaments.empty.play.title');
  const emptySubtitle = dateFilterActive
    ? 'Skús iný termín alebo zruš dátumový filter.'
    : audienceFilterActive
      ? 'Skús iný filter publika alebo zruš výber.'
      : mode === 'spectator'
        ? t('tournaments.empty.spectator.sub')
        : t('tournaments.empty.play.sub');

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
          title={
            <div className="space-y-1 min-w-0">
              <p className="font-label-caps text-[10px] uppercase tracking-[0.2em] text-secondary">
                {t('tournaments.eyebrow')}
              </p>
              <h1 className="font-headline-md text-[28px] leading-tight tracking-wide text-on-background sm:text-3xl md:text-4xl">
                {t('tournaments.title')}
              </h1>
            </div>
          }
          subtitle={
            <p className="mt-1 max-w-md font-body-md text-sm text-on-surface-variant md:text-body-md">
              {t('tournaments.subtitle')}
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
                {t('tournaments.create')}
              </Link>
            ) : undefined
          }
        />

        <TournamentsFeed
          tournaments={tournaments}
          allTournaments={rawTournaments}
          mode={mode}
          selectedSports={feedFilters.sports}
          eventDayKeys={dayKeys}
          emptyTitle={emptyTitle}
          emptySubtitle={emptySubtitle}
        />
      </main>

    </>
  );
}
