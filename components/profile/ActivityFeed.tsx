import type { KarmaHistoryEntry } from '@/lib/data/profile-stats';

interface ActivityFeedProps {
  entries: KarmaHistoryEntry[];
  embedded?: boolean;
}

interface KarmaVisual {
  icon: string;
  filled?: boolean;
  trailingIcon?: string;
  trailingFilled?: boolean;
}

function formatRelativeTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const ms = date.getTime();
  if (Number.isNaN(ms)) return '';

  const diffMs = Date.now() - ms;
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function karmaVisual(type: string, delta: number): KarmaVisual {
  const normalized = type.toLowerCase();

  if (normalized.includes('cheer')) return { icon: 'celebration', filled: true, trailingIcon: 'celebration', trailingFilled: true };
  if (normalized.includes('no_show') || normalized.includes('no-show')) {
    return { icon: 'cancel', trailingIcon: 'arrow_downward' };
  }
  if (normalized.includes('check')) return { icon: 'check_circle', trailingIcon: 'thumb_up' };
  if (normalized.includes('match') || normalized.includes('lobby')) {
    return { icon: 'emoji_events', trailingIcon: delta >= 0 ? 'arrow_upward' : 'arrow_downward', trailingFilled: delta >= 0 };
  }
  if (normalized.includes('tournament')) return { icon: 'emoji_events', filled: true };
  if (normalized.includes('lesson')) return { icon: 'school' };

  return {
    icon: 'dynamic_feed',
    trailingIcon: delta >= 0 ? 'add' : 'remove',
    trailingFilled: delta >= 0,
  };
}

function describeEntry(entry: KarmaHistoryEntry): string {
  const normalized = entry.type.toLowerCase().replace(/_/g, ' ');
  const actor = entry.actorName;

  if (actor && normalized.includes('cheer')) return `${actor} cheered your activity.`;
  if (normalized.includes('no_show')) return 'No-show penalty applied to your karma.';
  if (normalized.includes('check')) return 'Check-in confirmed — karma earned.';
  if (normalized.includes('match') || normalized.includes('lobby')) return 'Match activity updated your karma score.';
  if (normalized.includes('tournament')) return 'Tournament participation recorded.';
  if (normalized.includes('lesson')) return 'Training lesson activity recorded.';

  if (actor) return `${actor} affected your karma (${normalized}).`;
  return `Karma updated: ${normalized}.`;
}

export function ActivityFeed({ entries, embedded = false }: ActivityFeedProps) {
  return (
    <div className={embedded ? 'flex flex-col gap-3' : 'glass-panel rounded-xl p-6 md:p-8 flex flex-col gap-4'}>
      <div className={embedded ? undefined : 'flex justify-between items-end border-b border-white/10 pb-4 mb-2'}>
        <h2 className={embedded ? 'font-label-caps text-[10px] uppercase text-on-surface-variant tracking-widest' : 'font-headline-md text-headline-md text-on-surface'}>
          Recent Activity
        </h2>
      </div>

      {entries.length === 0 ? (
        <p className="font-body-md text-body-md text-tertiary-container py-4">
          No karma activity yet — join a match or get cheered on to start building your reputation.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {entries.map((entry) => {
            const visual = karmaVisual(entry.type, entry.delta);
            const deltaLabel = `${entry.delta >= 0 ? '+' : ''}${entry.delta}`;

            return (
              <div
                key={entry.id}
                className="flex items-start gap-4 p-3 rounded-lg hover:bg-surface-container/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-surface-container-high border border-white/10 flex items-center justify-center shrink-0 mt-1">
                  <span className="material-symbols-outlined text-secondary">{visual.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body-md text-body-md text-on-surface">{describeEntry(entry)}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="font-label-caps text-label-caps text-on-surface-variant">{formatRelativeTime(entry.createdAt)}</span>
                    <span
                      className={`font-label-caps text-label-caps ${entry.delta >= 0 ? 'text-secondary' : 'text-error'}`}
                    >
                      {deltaLabel} karma
                    </span>
                  </div>
                </div>
                {visual.trailingIcon && (
                  <span
                    className={`material-symbols-outlined shrink-0 ${
                      entry.delta >= 0 ? 'text-secondary' : 'text-on-surface-variant'
                    }`}
                  >
                    {visual.trailingIcon}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
