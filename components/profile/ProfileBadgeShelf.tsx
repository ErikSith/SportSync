'use client';

import type { EventAchievementHighlight, PlatformBadge } from '@/lib/data/profile-achievements';
import { badgeEmoji, sportEmoji } from '@/lib/constants/badge-emojis';

interface ProfileBadgeShelfProps {
  badges: PlatformBadge[];
  highlights: EventAchievementHighlight[];
  onBadgeClick: (badgeId: string) => void;
  onHighlightClick: () => void;
}

interface ShelfItem {
  id: string;
  emoji: string;
  unlocked: boolean;
  label: string;
  kind: 'badge' | 'highlight';
}

function buildShelfItems(badges: PlatformBadge[], highlights: EventAchievementHighlight[]): ShelfItem[] {
  const items: ShelfItem[] = [];

  for (const highlight of highlights.slice(0, 2)) {
    items.push({
      id: `highlight-${highlight.id}`,
      emoji: sportEmoji(highlight.sport),
      unlocked: highlight.badgeLabel === 'Finisher',
      label: highlight.title,
      kind: 'highlight',
    });
  }

  for (const badge of badges) {
    items.push({
      id: badge.id,
      emoji: badgeEmoji(badge.id),
      unlocked: badge.unlocked,
      label: badge.title,
      kind: 'badge',
    });
  }

  return items;
}

export function ProfileBadgeShelf({ badges, highlights, onBadgeClick, onHighlightClick }: ProfileBadgeShelfProps) {
  const items = buildShelfItems(badges, highlights);
  const unlockedCount = items.filter((i) => i.unlocked).length;
  const lockedCount = items.length - unlockedCount;

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-2 -mb-2">
      <p className="font-label-caps text-[10px] uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5">
        <span aria-hidden>🏆</span>
        Trophy case
        <span className="text-secondary">{unlockedCount}/{items.length}</span>
      </p>

      <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-full px-1 py-1">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => (item.kind === 'highlight' ? onHighlightClick() : onBadgeClick(item.id))}
            title={item.unlocked ? item.label : `Locked — tap to see how to unlock`}
            aria-label={item.unlocked ? item.label : `Locked badge, tap to reveal`}
            className={`group relative shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
              item.unlocked
                ? 'bg-secondary/15 border-2 border-secondary/50 shadow-[0_0_12px_rgba(233,195,73,0.35)] hover:scale-110 hover:-translate-y-0.5 active:scale-95'
                : 'bg-surface-container/60 border-2 border-white/10 opacity-80 hover:scale-105 hover:border-secondary/30 active:scale-95'
            }`}
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <span
              className={`select-none transition-all ${
                item.unlocked ? 'animate-[badge-pop_2s_ease-in-out_infinite]' : 'grayscale blur-[1px] opacity-50 group-hover:blur-none group-hover:opacity-70'
              }`}
              style={{ animationDelay: `${index * 200}ms` }}
            >
              {item.unlocked ? item.emoji : '❓'}
            </span>

            {!item.unlocked && (
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-surface-container-high border border-white/20 flex items-center justify-center text-[10px]">
                🔒
              </span>
            )}

            {item.unlocked && item.kind === 'highlight' && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary-container flex items-center justify-center text-[8px]">
                ✨
              </span>
            )}
          </button>
        ))}
      </div>

      {lockedCount > 0 && (
        <p className="font-label-caps text-[9px] uppercase text-on-surface-variant/80 tracking-wider flex items-center gap-1 animate-pulse">
          <span aria-hidden>👆</span>
          Tap to reveal {lockedCount} locked
        </p>
      )}
    </div>
  );
}
