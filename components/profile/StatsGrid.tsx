import type { Profile } from '@/lib/data/profile';
import type { ProfileGameStats } from '@/lib/data/profile-stats';

interface StatTile {
  label: string;
  value: number;
  icon: string;
}

interface StatsGridProps {
  profile: Profile;
  stats: ProfileGameStats;
  embedded?: boolean;
}

export function StatsGrid({ profile, stats, embedded = false }: StatsGridProps) {
  const tiles: StatTile[] = [
    { label: 'Matches Played', value: stats.completedLobbies, icon: 'sports_score' },
    { label: 'Karma Score', value: profile.karmaScore, icon: 'favorite' },
    { label: 'Season Points', value: profile.seasonPts, icon: 'military_tech' },
    { label: 'Tournaments', value: stats.tournamentRegistrations, icon: 'emoji_events' },
    { label: 'Lessons Booked', value: stats.lessonsBooked, icon: 'school' },
    { label: 'Lobbies Hosted', value: stats.lobbiesHosted, icon: 'groups' },
  ];

  return (
    <div className={embedded ? 'flex flex-col gap-3' : undefined}>
      {embedded && (
        <h3 className="font-label-caps text-[10px] uppercase text-on-surface-variant tracking-widest">Stats</h3>
      )}
      <section className={`grid grid-cols-2 md:grid-cols-3 gap-3 ${embedded ? '' : ''}`}>
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="glass-card rounded-xl p-4 flex flex-col items-center text-center gap-2 glow-hover transition-all"
        >
          <span className="material-symbols-outlined text-secondary text-2xl">{tile.icon}</span>
          <div className="font-display-lg-mobile text-display-lg-mobile text-primary-container leading-none">
            {tile.value.toLocaleString('en-US')}
          </div>
          <div className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest">{tile.label}</div>
        </div>
      ))}
      </section>
    </div>
  );
}
