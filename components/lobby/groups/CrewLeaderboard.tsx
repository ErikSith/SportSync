'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PollRefresh } from '@/lib/realtime/usePollingRefresh';
import type { MemberStatData } from '@/lib/data/sport-groups-shared';

interface CrewLeaderboardProps {
  groupId: string;
  leaderboard: MemberStatData[];
  isOwner: boolean;
}

const BADGE_STYLES: Record<string, { icon: string; className: string }> = {
  'Iron Man': { icon: 'military_tech', className: 'bg-primary-container/20 text-primary-container border-primary-container/30' },
  Ghost: { icon: 'visibility_off', className: 'bg-surface-container-high text-on-surface-variant border-outline-variant/40' },
  Champion: { icon: 'workspace_premium', className: 'bg-tertiary-container/20 text-tertiary-container border-tertiary-container/30' },
  Winner: { icon: 'star', className: 'bg-secondary/20 text-secondary border-secondary/30' },
};

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

function MemberAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img className="w-9 h-9 rounded-full object-cover border border-surface-variant" src={avatarUrl} alt={name} />
    );
  }
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-label-caps border border-surface-variant bg-surface-container-high">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function CrewLeaderboard({ groupId, leaderboard, isOwner }: CrewLeaderboardProps) {
  const router = useRouter();
  const [recordingId, setRecordingId] = useState<string | null>(null);

  async function recordWin(userId: string) {
    setRecordingId(userId);
    const res = await fetch(`/api/groups/${groupId}/stats/win`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    setRecordingId(null);
    if (res.ok) router.refresh();
  }

  return (
    <section className="glass-panel rounded-xl p-6 space-y-4 border border-tertiary-container/10">
      <PollRefresh intervalMs={15000} />
      <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
        <span className="material-symbols-outlined text-tertiary-container text-[22px]">leaderboard</span>
        Crew Leaderboard
      </h3>

      {leaderboard.length === 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant text-sm">
          RSVP to sessions to start earning points.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {leaderboard.map((member, index) => (
            <li
              key={member.userId}
              className="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface-container/50 border border-white/5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-6 text-center font-label-caps text-label-caps text-on-surface-variant shrink-0">
                  {RANK_MEDALS[index] ?? `#${index + 1}`}
                </span>
                <MemberAvatar name={member.name} avatarUrl={member.avatarUrl} />
                <div className="min-w-0">
                  <p className="font-body-md text-body-md text-on-surface font-semibold truncate">{member.name}</p>
                  <p className="font-body-md text-body-md text-on-surface-variant text-xs">
                    {member.sessionsAttended} attended • {member.sessionsDeclined} declined
                  </p>
                  {member.badges.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {member.badges.map((badge) => {
                        const style = BADGE_STYLES[badge] ?? {
                          icon: 'emoji_events',
                          className: 'bg-surface-container-high text-on-surface-variant border-outline-variant/40',
                        };
                        return (
                          <span
                            key={badge}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-label-caps text-[9px] uppercase tracking-wider ${style.className}`}
                          >
                            <span className="material-symbols-outlined text-[11px]">{style.icon}</span>
                            {badge}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-headline-md text-headline-md text-secondary font-bold">{member.points}</span>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => void recordWin(member.userId)}
                    disabled={recordingId === member.userId}
                    title="Record a win"
                    className="text-on-surface-variant hover:text-tertiary-container transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
