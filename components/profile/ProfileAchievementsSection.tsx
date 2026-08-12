import type { ProfileAchievementsBundle } from '@/lib/data/profile-achievements';
import { EventAchievementCard } from '@/components/profile/EventAchievementCard';
import { badgeEmoji } from '@/lib/constants/badge-emojis';

interface ProfileAchievementsSectionProps {
  achievements: ProfileAchievementsBundle;
}

export function ProfileAchievementsSection({ achievements }: ProfileAchievementsSectionProps) {
  const { badges, highlights } = achievements;
  const unlockedBadges = badges.filter((b) => b.unlocked);
  const topBadges = [...unlockedBadges, ...badges.filter((b) => !b.unlocked)].slice(0, 6);

  return (
    <section className="glass-panel rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            military_tech
          </span>
          Achievements
        </h2>
        <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">
          {unlockedBadges.length}/{badges.length} badges
        </span>
      </div>

      {highlights.length > 0 && (
        <div className="flex flex-col gap-3">
          {highlights.slice(0, 2).map((highlight) => (
            <EventAchievementCard key={highlight.id} highlight={highlight} />
          ))}
        </div>
      )}

      {topBadges.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {topBadges.map((badge) => (
            <div
              key={badge.id}
              className={`min-w-[110px] bg-surface-container/40 border rounded-xl p-3 flex flex-col items-center text-center shrink-0 ${
                badge.unlocked ? 'border-secondary/40' : 'border-white/10 opacity-70'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 text-2xl ${
                  badge.unlocked ? 'bg-secondary/10' : 'bg-surface-bright grayscale opacity-60'
                }`}
              >
                {badge.unlocked ? badgeEmoji(badge.id) : '?'}
              </div>
              <span
                className={`font-label-caps text-[9px] tracking-widest uppercase mb-0.5 ${
                  badge.unlocked ? 'text-secondary' : 'text-on-surface-variant'
                }`}
              >
                {badge.category}
              </span>
              <span className="font-headline-md text-xs text-on-surface leading-tight">{badge.title}</span>
            </div>
          ))}
        </div>
      ) : highlights.length === 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant text-sm py-2">
          Join events and tournaments to build your highlight reel.
        </p>
      ) : null}
    </section>
  );
}
