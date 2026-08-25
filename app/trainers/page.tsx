import { Suspense } from 'react';
import Link from 'next/link';
import { t } from '@/lib/i18n/server';
import { SetupNotice } from '@/components/i18n/SetupNotice';
import { getPageViewer } from '@/lib/auth/viewer';
import { getVenuesForHomeFilter } from '@/lib/data/homepage';
import { getCoaches } from '@/lib/data/trainers';
import { TrainersGrid } from '@/components/trainers/TrainersGrid';
import { PageTitleRow } from '@/components/shared/PageTitleRow';
import { PlayerFeedFilterHydrator } from '@/components/home/HomeFeedFilterButton';
import { matchesCoachSportsFilter, parseHomeFeedFilters } from '@/lib/home-feed-filters';

export const runtime = 'edge';

interface TrainersPageProps {
  searchParams: { sport?: string; venues?: string; type?: string; sort?: string };
}

export default async function TrainersPage({ searchParams }: TrainersPageProps) {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return <SetupNotice />;
  }

  const { profile } = viewer;

  const city = profile.city ?? 'Bratislava';
  const feedFilters = parseHomeFeedFilters(searchParams);
  const dbSport = feedFilters.sports.length === 1 ? feedFilters.sports[0] : undefined;

  const [filterVenues, rawCoaches] = await Promise.all([
    getVenuesForHomeFilter(city),
    getCoaches({
      sport: dbSport,
      sort: searchParams.sort,
      viewerLat: profile.latitude,
      viewerLng: profile.longitude,
    }),
  ]);

  const coaches = rawCoaches.filter((coach) => matchesCoachSportsFilter(coach.sports, feedFilters));

  return (
    <>
      <Suspense fallback={null}>
        <PlayerFeedFilterHydrator />
      </Suspense>
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between px-gutter h-16 w-full max-w-7xl mx-auto">
          <span className="w-10 h-10" aria-hidden />
          <Link href="/" className="font-display-lg-mobile text-display-lg-mobile font-bold tracking-tighter gradient-text">
            SPORTSYNC
          </Link>
          <Link
            href="/profile"
            className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant/50 overflow-hidden hover:opacity-80 transition-opacity flex items-center justify-center"
            aria-label={t('nav.profile')}
          >
            <span className="material-symbols-outlined text-on-surface-variant">person</span>
          </Link>
        </div>
      </header>

      <main className="pt-24 px-container-margin-mobile md:px-container-margin-desktop max-w-7xl mx-auto pb-8">
        <PageTitleRow
          city={city}
          venues={filterVenues}
          title={<h2 className="font-headline-md text-headline-md text-on-surface">{t('trainers.title')}</h2>}
          subtitle={
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              {t('trainers.subtitle')}
            </p>
          }
        />

        {coaches.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center space-y-3 mt-8">
            <p className="font-body-md text-body-md text-on-surface">{t('trainers.empty')}</p>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {t('trainers.emptySub')}
            </p>
          </div>
        ) : (
          <div className="mt-8">
            <TrainersGrid coaches={coaches} />
          </div>
        )}
      </main>

    </>
  );
}
