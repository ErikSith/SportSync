import Link from 'next/link';
import type { Profile } from '@/lib/data/profile';
import type { ProfileGameStats } from '@/lib/data/profile-stats';
import { profileTierLabel } from '@/lib/data/profile-stats';
import type { UserGoalView } from '@/lib/data/profile-goals';
import type { EventAchievementHighlight } from '@/lib/data/profile-achievements';
import { ProfileSpotlight } from '@/components/profile/ProfileSpotlight';
import { initialsFromName } from '@/lib/utils/initials';

interface ProfileHeaderProps {
  profile: Profile;
  stats: ProfileGameStats;
  featuredGoal?: UserGoalView | null;
  topHighlight?: EventAchievementHighlight | null;
  cityRank?: number | null;
}

export function ProfileHeader({
  profile,
  stats,
  featuredGoal = null,
  topHighlight = null,
  cityRank = null,
}: ProfileHeaderProps) {
  const displayName = profile.fullName ?? profile.username;
  const tier = profileTierLabel(profile.karmaScore);
  const initials = initialsFromName(displayName);
  const city = profile.city ?? 'Bratislava';

  const inlineStats = [
    `${stats.completedLobbies} matches`,
    `${profile.karmaScore} karma`,
    cityRank !== null ? `#${cityRank} ${city}` : city,
    `${profile.seasonPts} season pts`,
  ].join(' · ');

  return (
    <section className="flex flex-col items-center text-center relative py-2">
      <Link
        href="/profile#location"
        aria-label="Edit profile location"
        className="absolute top-0 right-0 p-2 rounded-lg text-on-surface-variant hover:text-secondary transition-colors"
      >
        <span className="material-symbols-outlined text-xl">edit</span>
      </Link>

      <div className="w-28 h-28 md:w-32 md:h-32 rounded-xl border-2 border-secondary overflow-hidden shadow-[0_0_15px_rgba(233,195,73,0.25)] mb-3">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="w-full h-full object-cover" src={profile.avatarUrl} alt={displayName} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface-container-high font-headline-md text-headline-md text-on-surface">
            {initials}
          </div>
        )}
      </div>

      <div className="inline-flex items-center gap-2 bg-secondary/10 border border-secondary/50 px-3 py-1 rounded-full mb-3">
        <span className="font-label-caps text-[10px] text-secondary tracking-widest uppercase font-bold">{tier}</span>
      </div>

      <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-1">
        {displayName}
      </h1>
      <p className="font-label-caps text-label-caps text-on-surface-variant mb-4">
        @{profile.username} · {city}
      </p>

      <ProfileSpotlight featuredGoal={featuredGoal} topHighlight={topHighlight} />

      <p className="font-label-caps text-[10px] uppercase text-on-surface-variant tracking-wide max-w-md leading-relaxed">
        {inlineStats}
      </p>
    </section>
  );
}
