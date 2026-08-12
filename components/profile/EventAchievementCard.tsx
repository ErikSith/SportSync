import type { EventAchievementHighlight } from '@/lib/data/profile-achievements';
import { sportEmoji } from '@/lib/constants/badge-emojis';

interface EventAchievementCardProps {
  highlight: EventAchievementHighlight;
}

function formatPlacement(placement: number | null, total: number | null): string | null {
  if (placement === null) return null;
  if (total !== null) return `#${placement.toLocaleString('en-US')} / ${total.toLocaleString('en-US')}`;
  return `#${placement.toLocaleString('en-US')}`;
}

export function EventAchievementCard({ highlight }: EventAchievementCardProps) {
  const placementText = formatPlacement(highlight.placement, highlight.totalParticipants);
  const isFinisher = highlight.badgeLabel === 'Finisher';

  return (
    <div
      className={`flex items-center gap-4 bg-surface-container/40 p-4 rounded-lg border relative overflow-hidden ${
        isFinisher ? 'border-secondary/30 shadow-[0_0_12px_rgba(233,195,73,0.2)]' : 'border-white/5'
      }`}
    >
      {isFinisher && <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary" />}

      <div className="w-12 h-12 rounded-full bg-secondary/10 border border-secondary/30 flex items-center justify-center shrink-0 text-2xl">
        {sportEmoji(highlight.sport)}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-headline-md text-[16px] text-on-surface leading-tight truncate">{highlight.title}</h4>
        <p className="font-label-caps text-[10px] uppercase text-on-surface-variant tracking-widest mt-1">
          {highlight.sport} · {highlight.badgeLabel}
        </p>
        {placementText && (
          <p className={`font-display-lg-mobile text-lg mt-1 ${isFinisher ? 'text-secondary' : 'text-on-surface-variant'}`}>
            {placementText}
          </p>
        )}
        {highlight.finishTime && (
          <p className="font-body-md text-body-md text-on-surface-variant text-sm mt-0.5">Finish: {highlight.finishTime}</p>
        )}
      </div>

      <span className="material-symbols-outlined text-on-surface-variant shrink-0">
        {highlight.kind === 'tournament' ? 'emoji_events' : 'directions_run'}
      </span>
    </div>
  );
}
