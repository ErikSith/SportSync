'use client';

import { useState } from 'react';
import type {
  MatchActivityCard,
  Profile,
  ProfileGameStatsView,
  ProfileHeroStats,
} from '@/lib/data/profile-shared';
import { ProfileHero } from '@/components/profile/ProfileHero';
import { ProfileSportsSection } from '@/components/profile/ProfileSportsSection';
import { ProfileMatchActivity } from '@/components/profile/ProfileMatchActivity';
import { StatsGrid } from '@/components/profile/StatsGrid';

interface KarmaFallbackItem {
  id: string;
  type: string;
  delta: number;
  createdAt: string;
}

interface ProfileTopSectionsProps {
  profile: Profile;
  heroStats: ProfileHeroStats;
  stats: ProfileGameStatsView;
  recentMatches: MatchActivityCard[];
  karmaFallback: KarmaFallbackItem[];
  editable?: boolean;
  showStatsExpand?: boolean;
}

export function ProfileTopSections({
  profile,
  heroStats,
  stats,
  recentMatches,
  karmaFallback,
  editable = false,
  showStatsExpand = true,
}: ProfileTopSectionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const safeSkills = profile.sportSkills ?? {};
  const safeSports = profile.preferredSports ?? [];

  return (
    <>
      <ProfileHero
        profile={{ ...profile, sportSkills: safeSkills, preferredSports: safeSports }}
        heroStats={heroStats}
        editable={editable}
        editOpen={editOpen}
        onEditOpenChange={setEditOpen}
      />

      <ProfileSportsSection
        preferredSports={safeSports}
        sportSkills={safeSkills}
        editable={editable}
        onAdd={() => setEditOpen(true)}
      />

      <ProfileMatchActivity matches={recentMatches ?? []} karmaFallback={karmaFallback ?? []} />

      {showStatsExpand ? (
        <section id="moje-statistiky" className="scroll-mt-28">
          <StatsGrid profile={profile} stats={stats} embedded />
        </section>
      ) : null}
    </>
  );
}
