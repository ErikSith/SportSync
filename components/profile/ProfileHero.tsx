'use client';

import { useState } from 'react';
import type { Profile } from '@/lib/data/profile';
import type { ProfileGameStats } from '@/lib/data/profile-stats';
import { profileTierLabel } from '@/lib/utils/profile-tier';
import { initialsFromName } from '@/lib/utils/initials';
import { ProfileEditSheet } from '@/components/profile/ProfileEditSheet';

interface ProfileHeroProps {
  profile: Profile;
  stats: ProfileGameStats;
  cityRank?: number | null;
  editable?: boolean;
}

function coverStyle(profile: Profile): React.CSSProperties | undefined {
  if (profile.coverUrl) {
    return { backgroundImage: `url('${profile.coverUrl}')` };
  }
  return undefined;
}

function coverClass(profile: Profile): string {
  if (profile.coverUrl) return 'bg-cover bg-center';
  const tier = profileTierLabel(profile.karmaScore);
  if (tier === 'LEGEND' || tier === 'ELITE TIER') {
    return 'bg-gradient-to-br from-surface-container-high via-secondary/20 to-primary-container/30';
  }
  if (tier === 'PRO TIER' || tier === 'RISING STAR') {
    return 'bg-gradient-to-br from-surface-container-high via-primary-container/20 to-secondary/10';
  }
  return 'bg-gradient-to-br from-surface-container-high via-primary-container/10 to-surface-container';
}

export function ProfileHero({ profile, stats, cityRank = null, editable = false }: ProfileHeroProps) {
  const [editOpen, setEditOpen] = useState(false);
  const displayName = profile.fullName ?? profile.username;
  const tier = profileTierLabel(profile.karmaScore);
  const initials = initialsFromName(displayName);
  const city = profile.city ?? 'Bratislava';

  const statChips = [
    { label: 'Matches', value: stats.completedLobbies },
    { label: 'Karma', value: profile.karmaScore },
    { label: 'Season', value: profile.seasonPts },
  ];

  return (
    <>
      <section className="glass-panel rounded-xl overflow-hidden relative">
        <div className={`h-48 md:h-56 w-full relative ${coverClass(profile)}`} style={coverStyle(profile)}>
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/70 to-transparent" />
          {editable && (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              aria-label="Edit profile"
              className="absolute top-4 right-4 p-2 rounded-lg bg-surface/60 backdrop-blur-sm text-on-surface-variant hover:text-secondary transition-colors border border-white/10"
            >
              <span className="material-symbols-outlined text-xl">edit</span>
            </button>
          )}
        </div>

        <div className="px-5 pb-5 -mt-12 relative z-10">
          <div className="flex items-end gap-4 mb-4">
            <div className="w-24 h-24 rounded-xl border-2 border-secondary overflow-hidden shadow-[0_0_15px_rgba(233,195,73,0.25)] shrink-0 bg-surface-container-high">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="w-full h-full object-cover" src={profile.avatarUrl} alt={displayName} />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-headline-md text-headline-md text-on-surface">
                  {initials}
                </div>
              )}
            </div>

            <div className="inline-flex items-center gap-2 bg-secondary/10 border border-secondary/50 px-3 py-1 rounded-full mb-1">
              <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                stars
              </span>
              <span className="font-label-caps text-[10px] text-secondary tracking-widest uppercase font-bold">{tier}</span>
            </div>
          </div>

          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-1">
            {displayName}
          </h1>
          <p className="font-label-caps text-label-caps text-on-surface-variant mb-2">
            @{profile.username} · {city}
            {cityRank !== null && ` · #${cityRank} in ${city}`}
          </p>

          {profile.bio && (
            <p className="font-body-md text-body-md text-on-surface-variant mb-4 max-w-md leading-relaxed">{profile.bio}</p>
          )}

          {profile.preferredSports.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {profile.preferredSports.map((sport) => (
                <span
                  key={sport}
                  className="font-label-caps text-[10px] uppercase px-2.5 py-1 rounded-full bg-primary-container/20 text-primary-container border border-primary-container/30"
                >
                  {sport}
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            {statChips.map((chip) => (
              <div
                key={chip.label}
                className="flex-1 bg-surface-container/60 rounded-lg p-3 text-center border border-white/5"
              >
                <div className="font-display-lg-mobile text-display-lg-mobile text-primary-container mb-0.5">{chip.value}</div>
                <div className="font-label-caps text-[10px] text-on-surface-variant uppercase">{chip.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {editable && <ProfileEditSheet open={editOpen} onClose={() => setEditOpen(false)} profile={profile} />}
    </>
  );
}
