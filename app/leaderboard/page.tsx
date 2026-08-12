import Link from 'next/link';
import { getPageViewer } from '@/lib/auth/viewer';
import { getTopProfilesByCity } from '@/lib/data/homepage';
import { getBratislavaVenueLeaderboard } from '@/lib/data/bratislava-leaderboard';
import { LeaderboardWidget } from '@/components/home/LeaderboardWidget';
import { BratislavaVenueLeaderboard } from '@/components/home/BratislavaVenueLeaderboard';
import { TrackPageView } from '@/components/telemetry/TrackPageView';

export default async function LeaderboardPage() {
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
  const entries = await getTopProfilesByCity(city, 20);
  const venueLeaderboard = await getBratislavaVenueLeaderboard(10);

  return (
    <>
      <TrackPageView page="leaderboard" extra={{ city }} />
      <header className="bg-background/80 backdrop-blur-xl fixed top-0 w-full z-50 border-b border-white/10">
        <div className="flex justify-between items-center px-container-margin-mobile h-16 max-w-screen-xl mx-auto">
          <Link href="/" className="text-primary" aria-label="Back home">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="font-display-lg-mobile text-display-lg-mobile font-bold tracking-tighter gradient-text">
            RANKINGS
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="pt-24 px-container-margin-mobile max-w-lg mx-auto pb-8 space-y-6">
        <LeaderboardWidget entries={entries} city={city} showFullLink={false} />
        <BratislavaVenueLeaderboard entries={venueLeaderboard} />
        <p className="text-center font-body-md text-body-md text-on-surface-variant">
          Rankings are based on karma earned from activity, sportsmanship, and community participation.
          A dedicated skill rating system is coming soon.
        </p>
      </main>

    </>
  );
}
