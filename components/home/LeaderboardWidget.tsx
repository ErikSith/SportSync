import Link from 'next/link';
import type { LeaderboardEntry } from '@/lib/data/homepage';
import { initialsFromName } from '@/lib/utils/initials';

const RANK_STYLES: Record<number, string> = {
  1: 'bg-surface-container-low border border-secondary/30 text-secondary shadow-[0_4px_15px_rgba(0,0,0,0.3)]',
};

export function LeaderboardWidget({
  entries,
  city,
  showFullLink = true,
}: {
  entries: LeaderboardEntry[];
  city: string;
  showFullLink?: boolean;
}) {
  return (
    <section className="glass-panel rounded-2xl p-6 h-full flex flex-col border border-secondary/10">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">emoji_events</span>
          Top Activists
        </h3>
        <span className="font-label-caps text-[10px] text-tertiary-container uppercase">{city}</span>
      </div>

      {entries.length === 0 ? (
        <p className="font-body-md text-body-md text-tertiary-container flex-grow">
          No ranked players in {city} yet — be the first to earn karma!
        </p>
      ) : (
        <div className="space-y-4 flex-grow">
          {entries.map((entry) => {
            const initials = initialsFromName(entry.name);
            const highlight = RANK_STYLES[entry.rank];

            return (
              <div
                key={entry.id}
                className={`flex items-center gap-4 p-3 rounded-lg relative overflow-hidden ${
                  highlight ?? 'hover:bg-surface-container-low transition-colors border border-transparent hover:border-secondary/20'
                }`}
              >
                {entry.rank === 1 && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-secondary to-secondary-container" />
                )}
                <span
                  className={`font-headline-md text-[20px] font-bold w-6 text-center ${
                    entry.rank === 1 ? 'text-secondary' : entry.rank === 2 ? 'text-tertiary' : 'text-tertiary-container'
                  }`}
                >
                  {entry.rank}
                </span>
                <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-bright border border-outline-variant/30 flex items-center justify-center shrink-0">
                  {entry.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="w-full h-full object-cover" src={entry.avatarUrl} alt={entry.name} />
                  ) : (
                    <span className="font-label-caps text-[10px] text-on-surface">{initials}</span>
                  )}
                </div>
                <div className="flex-grow">
                  <h5 className="font-headline-md text-[16px] font-semibold text-on-surface leading-tight">{entry.name}</h5>
                  <span className="font-label-caps text-[10px] text-outline tracking-widest uppercase">
                    {entry.role.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`font-headline-md text-[16px] font-bold ${entry.rank === 1 ? 'text-secondary' : 'text-on-surface'}`}
                  >
                    {entry.karmaScore.toLocaleString('en-US')}
                  </span>
                  {entry.rank === 1 && <p className="font-label-caps text-[10px] text-tertiary-container">PTS</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showFullLink && (
        <Link
          href="/leaderboard"
          className="w-full mt-6 py-3 rounded-lg border border-secondary/30 bg-gradient-to-b from-surface/50 to-surface-container-low/50 hover:from-surface-container hover:to-surface-container-high hover:border-secondary/60 text-secondary font-label-caps text-label-caps transition-all duration-300 text-center"
        >
          FULL LEADERBOARD
        </Link>
      )}
    </section>
  );
}
