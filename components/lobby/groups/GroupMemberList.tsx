import type { GroupMemberData } from '@/lib/data/sport-groups-shared';

interface GroupMemberListProps {
  members: GroupMemberData[];
}

function MemberAvatar({ name, avatarUrl, isOwner }: { name: string; avatarUrl: string | null; isOwner: boolean }) {
  if (avatarUrl) {
    return (
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={`w-12 h-12 rounded-full object-cover ${isOwner ? 'border-2 border-secondary' : 'border border-surface-variant'}`}
          src={avatarUrl}
          alt={name}
        />
        {isOwner && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-secondary rounded-full flex items-center justify-center border-2 border-surface-container">
            <span className="material-symbols-outlined text-[10px] text-on-secondary">star</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center text-xs font-label-caps ${
          isOwner ? 'border-2 border-secondary bg-surface-container-high' : 'border border-surface-variant bg-surface-container-high'
        }`}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
      {isOwner && (
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-secondary rounded-full flex items-center justify-center border-2 border-surface-container">
          <span className="material-symbols-outlined text-[10px] text-on-secondary">star</span>
        </div>
      )}
    </div>
  );
}

export function GroupMemberList({ members }: GroupMemberListProps) {
  return (
    <section className="glass-panel rounded-xl p-6 flex-1">
      <h3 className="font-headline-md text-headline-md text-on-surface mb-6 flex justify-between items-center">
        Crew
        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-normal">
          {members.length} {members.length === 1 ? 'Member' : 'Members'}
        </span>
      </h3>

      <ul className="flex flex-col gap-4">
        {members.map((member) => (
          <li
            key={member.id}
            className={`flex items-center justify-between p-3 rounded-lg ${
              member.isOwner
                ? 'bg-surface-container-highest/50 border border-secondary/20'
                : 'hover:bg-surface-container/50 transition-colors'
            }`}
          >
            <div className="flex items-center gap-4">
              <MemberAvatar name={member.name} avatarUrl={member.avatarUrl} isOwner={member.isOwner} />
              <div>
                <p className="font-body-md text-body-md text-on-surface font-semibold flex items-center gap-2">
                  {member.name}
                  {member.isOwner && (
                    <span className="px-2 py-0.5 bg-secondary/20 text-secondary rounded text-[10px] uppercase font-bold tracking-wider">
                      Owner
                    </span>
                  )}
                </p>
                <p className="font-body-md text-body-md text-on-surface-variant text-sm capitalize">{member.role}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
