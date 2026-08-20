import type { Profile, ProfileGameStatsView } from '@/lib/data/profile-shared';

interface StatTile {
  label: string;
  value: number;
  icon: string;
}

interface StatsGridProps {
  profile: Profile;
  stats: ProfileGameStatsView;
  embedded?: boolean;
}

export function StatsGrid({ profile, stats, embedded = false }: StatsGridProps) {
  const tiles: StatTile[] = [
    { label: 'Zápasy', value: stats.gamesPlayed || stats.completedLobbies, icon: 'sports_score' },
    { label: 'Skupiny', value: stats.groupsCount, icon: 'groups' },
    { label: 'Karma', value: profile.karmaScore, icon: 'favorite' },
    { label: 'Sezóna', value: profile.seasonPts, icon: 'military_tech' },
    { label: 'Turnaje', value: stats.tournamentRegistrations, icon: 'emoji_events' },
    { label: 'Lekcie', value: stats.lessonsBooked, icon: 'school' },
    { label: 'Hostené', value: stats.lobbiesHosted, icon: 'stadium' },
  ];

  return (
    <div className={embedded ? 'flex flex-col gap-2.5' : undefined}>
      {embedded ? (
        <h3 className="px-0.5 font-headline-md text-[1.05rem] text-on-surface">Štatistiky</h3>
      ) : null}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="flex min-h-[88px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/8 bg-surface-container px-2 py-3 text-center"
          >
            <span className="material-symbols-outlined text-[20px] text-secondary">{tile.icon}</span>
            <div className="font-display-lg-mobile text-[1.35rem] leading-none text-primary-container">
              {tile.value.toLocaleString('sk-SK')}
            </div>
            <div className="font-label-caps text-[9px] uppercase tracking-[0.12em] text-on-surface-variant">
              {tile.label}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
