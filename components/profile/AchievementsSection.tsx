import type { ProfileAchievementsBundle, PlatformBadge } from '@/lib/data/profile-achievements';
import { EventAchievementCard } from '@/components/profile/EventAchievementCard';
import { badgeEmoji } from '@/lib/constants/badge-emojis';

function BadgeCard({ badge, highlighted = false }: { badge: PlatformBadge; highlighted?: boolean }) {
  const emoji = badgeEmoji(badge.id);

  return (
    <div
      id={`badge-${badge.id}`}
      className={`min-w-[110px] bg-surface-container/40 border rounded-xl p-3 flex flex-col items-center text-center transition-all duration-300 scroll-mt-4 ${
        highlighted
          ? 'border-secondary ring-2 ring-secondary/50 shadow-[0_0_16px_rgba(233,195,73,0.4)] scale-105'
          : badge.unlocked
            ? 'border-secondary/40 shadow-[0_0_12px_rgba(233,195,73,0.25)]'
            : 'border-white/10 opacity-70'
      }`}
    >
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 text-2xl ${
          badge.unlocked ? 'bg-secondary/10' : 'bg-surface-bright grayscale opacity-60'
        }`}
      >
        {badge.unlocked ? emoji : '❓'}
      </div>
      <span
        className={`font-label-caps text-[9px] tracking-widest uppercase mb-0.5 ${
          badge.unlocked ? 'text-secondary' : 'text-on-surface-variant'
        }`}
      >
        {badge.category}
      </span>
      <span className="font-headline-md text-xs text-on-surface leading-tight">{badge.title}</span>
      {badge.unlocked && (
        <span className="font-label-caps text-[8px] uppercase text-secondary mt-1.5">{emoji} Unlocked</span>
      )}
      {!badge.unlocked && badge.progressHint && (
        <span className="font-label-caps text-[8px] uppercase text-on-surface-variant mt-1.5 leading-tight">
          {badge.progressHint}
        </span>
      )}
    </div>
  );
}

interface AchievementsTabContentProps {
  achievements: ProfileAchievementsBundle;
}

export function AchievementsTabContent({ achievements }: AchievementsTabContentProps) {
  const { highlights } = achievements;

  if (highlights.length === 0) {
    return (
      <p className="font-body-md text-body-md text-on-surface-variant text-sm py-6 text-center">
        Join events and tournaments to build your highlight reel 🏃
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {highlights.slice(0, 2).map((highlight) => (
        <EventAchievementCard key={highlight.id} highlight={highlight} />
      ))}
    </div>
  );
}

interface BadgesTabContentProps extends AchievementsTabContentProps {
  highlightBadgeId?: string | null;
}

export function BadgesTabContent({ achievements, highlightBadgeId = null }: BadgesTabContentProps) {
  const { badges } = achievements;
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <div>
      <p className="font-label-caps text-[10px] uppercase text-on-surface-variant tracking-widest mb-3">
        {unlockedCount}/{badges.length} unlocked · collect them all 🎮
      </p>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {badges.map((badge) => (
          <BadgeCard key={badge.id} badge={badge} highlighted={highlightBadgeId === badge.id} />
        ))}
      </div>
    </div>
  );
}

interface AchievementsSectionProps {
  achievements: ProfileAchievementsBundle;
}

/** Standalone achievements section — prefer ProfileSuccessPanel for minimalist layout. */
export function AchievementsSection({ achievements }: AchievementsSectionProps) {
  return (
    <section className="glass-panel rounded-xl p-6 flex flex-col gap-6">
      <AchievementsTabContent achievements={achievements} />
      <BadgesTabContent achievements={achievements} />
    </section>
  );
}
