import Link from 'next/link';
import type { GroupCardData } from '@/lib/data/sport-groups-shared';
import { formatGroupSchedule, GROUP_SPORT_ICONS, sportDisplayLabel } from '@/lib/data/sport-groups-shared';

interface GroupCardProps {
  group: GroupCardData;
  variant?: 'default' | 'compact';
}

export function GroupCard({ group, variant = 'default' }: GroupCardProps) {
  const icon = GROUP_SPORT_ICONS[group.sport.toUpperCase()] ?? 'groups';
  const href = group.nextActivityId
    ? `/lobby/groups/${group.id}/sessions/${group.nextActivityId}`
    : `/lobby/groups/${group.id}`;

  if (variant === 'compact') {
    return (
      <Link
        href={href}
        className="rounded-xl border border-white/10 bg-zinc-950/60 p-3 flex flex-col gap-2 min-w-[180px] md:min-w-0 glow-hover transition-all group no-underline"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center border border-white/5 shrink-0">
            <span className="material-symbols-outlined text-secondary text-[18px]">{icon}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-headline-md text-[15px] font-semibold text-on-surface truncate">{group.name}</h3>
            <span className="text-[10px] font-label-caps text-secondary-container">
              {sportDisplayLabel(group.sport)}
              {group.isOwner ? ' • Owner' : ''}
            </span>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant text-[18px] shrink-0 group-hover:text-secondary transition-colors">
            chevron_right
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {group.members.slice(0, 3).map((member) =>
              member.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={member.id}
                  className="w-7 h-7 rounded-full border-2 border-background object-cover"
                  src={member.avatarUrl}
                  alt={member.name}
                />
              ) : (
                <div
                  key={member.id}
                  className="w-7 h-7 rounded-full border-2 border-background bg-surface-container-high flex items-center justify-center text-[8px] font-label-caps"
                >
                  {member.name.slice(0, 2).toUpperCase()}
                </div>
              ),
            )}
          </div>
          <span className="text-[11px] text-on-surface-variant">
            {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
          </span>
        </div>

        {group.nextActivityAt ? (
          <p className="font-body-md text-on-surface-variant text-[11px] flex items-center gap-1 truncate">
            <span className="material-symbols-outlined text-primary text-[14px] shrink-0">event</span>
            {formatGroupSchedule(group.nextActivityAt)}
          </p>
        ) : (
          <p className="font-body-md text-on-surface-variant text-[11px] italic">No session planned</p>
        )}
      </Link>
    );
  }

  return (
    <article className="glass-card rounded-xl p-6 flex flex-col gap-5 min-w-[280px] md:min-w-0 glow-hover transition-all group">
      <div className="flex justify-between items-start gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center border border-white/5 group-hover:border-primary/30 transition-colors shrink-0">
            <span className="material-symbols-outlined text-secondary text-[24px]">{icon}</span>
          </div>
          <div className="min-w-0">
            <h3 className="font-headline-md text-body-lg font-semibold text-on-surface truncate">{group.name}</h3>
            <span className="text-xs font-label-caps text-secondary-container">{sportDisplayLabel(group.sport)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant border border-white/10 rounded text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">lock</span>
            Private
          </span>
          {group.isOwner && (
            <span className="px-2 py-0.5 bg-secondary/20 text-secondary rounded text-[10px] uppercase font-bold tracking-wider">
              Owner
            </span>
          )}
        </div>
      </div>

      {group.description && (
        <p className="font-body-md text-on-surface-variant text-sm line-clamp-2">{group.description}</p>
      )}

      <div className="flex items-center gap-2">
        <div className="flex -space-x-3">
          {group.members.slice(0, 4).map((member) =>
            member.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={member.id}
                className="w-10 h-10 rounded-full border-2 border-background object-cover"
                src={member.avatarUrl}
                alt={member.name}
              />
            ) : (
              <div
                key={member.id}
                className="w-10 h-10 rounded-full border-2 border-background bg-surface-container-high flex items-center justify-center text-[10px] font-label-caps"
              >
                {member.name.slice(0, 2).toUpperCase()}
              </div>
            ),
          )}
        </div>
        <span className="text-xs text-on-surface-variant ml-2">
          {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
        </span>
      </div>

      {group.nextActivityAt ? (
        <p className="font-body-md text-on-surface-variant text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[16px]">event</span>
          {group.nextActivityTitle} • {formatGroupSchedule(group.nextActivityAt)}
        </p>
      ) : (
        <p className="font-body-md text-on-surface-variant text-sm italic">No upcoming sessions planned</p>
      )}

      <Link
        href={href}
        className="w-full py-3 mt-auto bg-transparent border border-secondary text-secondary rounded-lg font-label-caps text-label-caps hover:bg-secondary/10 transition-colors text-center"
      >
        {group.nextActivityId ? 'COORDINATE CREW' : 'OPEN CREW'}
      </Link>
    </article>
  );
}
