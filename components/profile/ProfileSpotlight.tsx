import type { UserGoalView } from '@/lib/data/profile-goals';
import type { EventAchievementHighlight } from '@/lib/data/profile-achievements';

interface ProfileSpotlightProps {
  featuredGoal: UserGoalView | null;
  topHighlight: EventAchievementHighlight | null;
}

export function FeaturedGoalProgress({ goal }: { goal: UserGoalView }) {
  return (
    <div className="w-full max-w-md mb-4 px-2">
      <div className="flex justify-between items-center mb-2">
        <span className="font-label-caps text-[10px] uppercase text-on-surface-variant tracking-widest truncate pr-2">
          {goal.title}
        </span>
        <span className="font-label-caps text-[10px] uppercase text-secondary shrink-0">{goal.progressLabel}</span>
      </div>
      <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary-container to-secondary-container transition-all duration-500"
          style={{ width: `${Math.min(100, goal.progressPercent)}%` }}
        />
      </div>
    </div>
  );
}

function EventHighlightSpotlight({ highlight }: { highlight: EventAchievementHighlight }) {
  const placementText =
    highlight.placement !== null && highlight.totalParticipants !== null
      ? `#${highlight.placement.toLocaleString('en-US')} / ${highlight.totalParticipants.toLocaleString('en-US')}`
      : null;

  return (
    <div className="w-full max-w-md mb-4 px-2 text-center">
      <p className="font-body-md text-body-md text-on-surface-variant">{highlight.title}</p>
      {placementText && (
        <p className="font-label-caps text-[10px] uppercase text-secondary tracking-widest mt-1">{placementText}</p>
      )}
    </div>
  );
}

export function ProfileSpotlight({ featuredGoal, topHighlight }: ProfileSpotlightProps) {
  if (featuredGoal?.status === 'active') {
    return <FeaturedGoalProgress goal={featuredGoal} />;
  }

  if (topHighlight?.badgeLabel === 'Finisher') {
    return <EventHighlightSpotlight highlight={topHighlight} />;
  }

  return null;
}
