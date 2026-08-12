import Link from 'next/link';
import type { BratislavaVenueEntry } from '@/lib/data/bratislava-leaderboard';

const RANK_STYLES: Record<number, string> = {
  1: 'bg-surface-container-low border border-secondary/30 text-secondary shadow-[0_4px_15px_rgba(0,0,0,0.3)]',
};

export function BratislavaVenueLeaderboard({
  entries,
}: {
  entries: BratislavaVenueEntry[];
}) {
  return (
    <section className="glass-panel rounded-2xl p-6 h-full flex flex-col border border-secondary/10">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">location_city</span>
          Top Športoviská
        </h3>
        <span className="font-label-caps text-[10px] text-tertiary-container uppercase">Bratislava</span>
      </div>

      {entries.length === 0 ? (
        <p className="font-body-md text-body-md text-tertiary-container flex-grow">
          No ranked venues in Bratislava yet — host an event to climb the board!
        </p>
      ) : (
        <div className="space-y-4 flex-grow">
          {entries.map((entry) => {
            const highlight = RANK_STYLES[entry.rank];
            return (
              <Link
                key={entry.venueId}
                href={`/venues/${entry.venueId}`}
                className={`flex items-center gap-4 p-3 rounded-lg relative overflow-hidden ${
                  highlight ??
                  'hover:bg-surface-container-low transition-colors border border-transparent hover:border-secondary/20'
                }`}
              >
                {entry.rank === 1 && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-secondary to-secondary-container" />
                )}
                <span
                  className={`font-headline-md text-[20px] font-bold w-6 text-center ${
                    entry.rank === 1
                      ? 'text-secondary'
                      : entry.rank === 2
                        ? 'text-tertiary'
                        : 'text-tertiary-container'
                  }`}
                >
                  {entry.rank}
                </span>
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-bright border border-outline-variant/30 flex items-center justify-center shrink-0">
                  {entry.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="w-full h-full object-cover" src={entry.coverUrl} alt={entry.name} />
                  ) : (
                    <span className="material-symbols-outlined text-outline text-[18px]">sports_tennis</span>
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h5 className="font-headline-md text-[16px] font-semibold text-on-surface leading-tight truncate">
                      {entry.name}
                    </h5>
                    {entry.verified && (
                      <span className="material-symbols-outlined text-secondary text-[14px]" title="Verified">
                        verified
                      </span>
                    )}
                  </div>
                  <span className="font-label-caps text-[10px] text-outline tracking-widest uppercase">
                    {entry.totalEvents} events · {entry.uniquePlayers} players
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`font-headline-md text-[16px] font-bold ${
                      entry.rank === 1 ? 'text-secondary' : 'text-on-surface'
                    }`}
                  >
                    {entry.score.toLocaleString('en-US')}
                  </span>
                  {entry.rank === 1 && <p className="font-label-caps text-[10px] text-tertiary-container">PTS</p>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}