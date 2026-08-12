import Link from 'next/link';
import type { LeaderboardEntry } from '@/lib/data/homepage';
import { LeaderboardWidget } from '@/components/home/LeaderboardWidget';

interface RankingsPanelProps {
  city: string;
  cityRank: number | null;
  tier: string;
  isTopTier: boolean;
  leaderboard: LeaderboardEntry[];
  embedded?: boolean;
}

export function RankingsPanel({ city, cityRank, tier, isTopTier, leaderboard, embedded = false }: RankingsPanelProps) {
  return (
    <div className={embedded ? 'flex flex-col gap-4' : 'glass-panel rounded-xl p-6 md:p-8 flex flex-col gap-4'}>
      {!embedded && (
        <div className="flex justify-between items-end border-b border-white/10 pb-4 mb-2">
          <h2 className="font-headline-md text-headline-md text-on-surface">Rankings</h2>
          <Link href="/leaderboard" className="text-secondary font-label-caps text-label-caps uppercase hover:underline">
            Full board
          </Link>
        </div>
      )}

      {embedded && (
        <div className="flex justify-between items-center">
          <h3 className="font-label-caps text-[10px] uppercase text-on-surface-variant tracking-widest">Rankings</h3>
          <Link href="/leaderboard" className="text-secondary font-label-caps text-[10px] uppercase hover:underline">
            Full board
          </Link>
        </div>
      )}

      <div
        className={`flex items-center gap-4 bg-surface-container/40 p-4 rounded-lg border relative overflow-hidden ${
          isTopTier ? 'border-secondary/30' : 'border-white/5'
        }`}
      >
        {isTopTier && <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary" />}
        <div className={`w-8 font-headline-md text-headline-md text-center ${isTopTier ? 'text-secondary' : 'text-on-surface-variant'}`}>
          {cityRank !== null ? `#${cityRank}` : '—'}
        </div>
        <div className="flex-1">
          <h4 className="font-headline-md text-[16px] text-on-surface leading-tight">{city}</h4>
          <p className="font-label-caps text-[10px] text-on-surface-variant uppercase mt-1">City rank</p>
        </div>
        <span className={`font-label-caps text-[10px] uppercase ${isTopTier ? 'text-secondary' : 'text-on-surface-variant'}`}>
          {tier}
        </span>
      </div>

      <LeaderboardWidget entries={leaderboard.slice(0, 3)} city={city} showFullLink={false} />
    </div>
  );
}
