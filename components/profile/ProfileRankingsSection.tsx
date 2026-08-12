import Link from 'next/link';
import type { LeaderboardEntry } from '@/lib/data/homepage';
import { LeaderboardWidget } from '@/components/home/LeaderboardWidget';

interface ProfileRankingsSectionProps {
  city: string;
  cityRank: number | null;
  tier: string;
  isTopTier: boolean;
  leaderboard: LeaderboardEntry[];
}

export function ProfileRankingsSection({
  city,
  cityRank,
  tier,
  isTopTier,
  leaderboard,
}: ProfileRankingsSectionProps) {
  return (
    <section className="glass-panel rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-container text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            leaderboard
          </span>
          Rankings
        </h2>
        <Link href="/leaderboard" className="font-label-caps text-[10px] uppercase text-secondary hover:underline">
          Full board
        </Link>
      </div>

      <div
        className={`flex items-center gap-4 bg-surface-container/40 p-4 rounded-lg border relative overflow-hidden ${
          isTopTier ? 'border-secondary/30' : 'border-white/5'
        }`}
      >
        {isTopTier && <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary" />}
        <div className={`w-8 font-headline-md text-center ${isTopTier ? 'text-secondary' : 'text-on-surface-variant'}`}>
          {cityRank !== null ? `#${cityRank}` : '—'}
        </div>
        <div className="flex-1">
          <h4 className="font-headline-md text-base text-on-surface leading-tight">{city}</h4>
          <p className="font-label-caps text-[10px] text-on-surface-variant uppercase mt-0.5">City rank · {tier}</p>
        </div>
      </div>

      <LeaderboardWidget entries={leaderboard.slice(0, 3)} city={city} showFullLink={false} />
    </section>
  );
}
