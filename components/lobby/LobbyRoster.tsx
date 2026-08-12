import type { LobbyDetailData } from '@/lib/data/lobbies';
import { lobbyTierLabel } from '@/lib/utils/lobby';

interface LobbyRosterProps {
  lobby: LobbyDetailData;
}

function ParticipantAvatar({ name, avatarUrl, isHost }: { name: string; avatarUrl: string | null; isHost: boolean }) {
  if (avatarUrl) {
    return (
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={`w-12 h-12 rounded-full object-cover ${isHost ? 'border-2 border-secondary' : 'border border-surface-variant'}`}
          src={avatarUrl}
          alt={name}
        />
        {isHost && (
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
          isHost ? 'border-2 border-secondary bg-surface-container-high' : 'border border-surface-variant bg-surface-container-high'
        }`}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
      {isHost && (
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-secondary rounded-full flex items-center justify-center border-2 border-surface-container">
          <span className="material-symbols-outlined text-[10px] text-on-secondary">star</span>
        </div>
      )}
    </div>
  );
}

export function LobbyRoster({ lobby }: LobbyRosterProps) {
  const tier = lobbyTierLabel(lobby.skillLevel);
  const emptySlots = Math.max(0, lobby.spotsTotal - lobby.participants.length);

  return (
    <section className="glass-panel rounded-xl p-6 flex-1">
      <h3 className="font-headline-md text-headline-md text-on-surface mb-6 flex justify-between items-center">
        Athletes
        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-normal">
          {lobby.participants.length} Joined
        </span>
      </h3>

      {lobby.mercenaryMode && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-primary-container/10 border border-primary-container/30 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-container text-[18px]">bolt</span>
          <p className="font-label-caps text-[10px] text-primary uppercase tracking-wider">Mercenary mode — emergency +1 broadcast</p>
        </div>
      )}

      <ul className="flex flex-col gap-4">
        {lobby.participants.map((participant) => (
          <li
            key={participant.id}
            className={`flex items-center justify-between p-3 rounded-lg ${
              participant.isHost
                ? 'bg-surface-container-highest/50 border border-secondary/20'
                : 'hover:bg-surface-container/50 transition-colors'
            }`}
          >
            <div className="flex items-center gap-4">
              <ParticipantAvatar name={participant.name} avatarUrl={participant.avatarUrl} isHost={participant.isHost} />
              <div>
                <p className="font-body-md text-body-md text-on-surface font-semibold flex items-center gap-2">
                  {participant.name}
                  {participant.isHost && (
                    <span className="px-2 py-0.5 bg-secondary/20 text-secondary rounded text-[10px] uppercase font-bold tracking-wider">
                      Host
                    </span>
                  )}
                </p>
                <p className="font-body-md text-body-md text-on-surface-variant text-sm">
                  {tier}
                  {participant.karmaScore > 0 ? ` • Karma ${Math.round(participant.karmaScore)}` : ''}
                </p>
              </div>
            </div>
          </li>
        ))}

        {Array.from({ length: emptySlots }).map((_, index) => (
          <li
            key={`empty-${index}`}
            className="flex items-center justify-between p-3 rounded-lg border border-dashed border-surface-variant/50 opacity-60"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined">person_add</span>
              </div>
              <div>
                <p className="font-body-md text-body-md text-on-surface-variant italic">Waiting for player…</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
