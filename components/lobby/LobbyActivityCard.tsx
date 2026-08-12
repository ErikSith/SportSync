'use client';

import Link from 'next/link';
import { MapPin, Signal } from 'lucide-react';
import type { MatchCardData, PlayerAvatar } from '@/types/lobby';
import { LobbyType } from '@/types/lobby';
import { skillLabelShort } from '@/components/lobby/lobby-ui';

interface LobbyActivityCardProps {
  match: MatchCardData;
  onView?: (id: string) => void;
  busyId?: string | null;
}

function Avatar({ player }: { player: PlayerAvatar }) {
  return (
    <div
      title={player.name}
      className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border-2 border-surface-container-low bg-surface-container-highest"
    >
      {player.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={player.image} alt={player.name} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[9px] font-semibold text-zinc-400">
          {player.name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function displayTitle(match: MatchCardData): string {
  if (match.type === LobbyType.TEAM_VS_TEAM) return match.teamName ?? match.title;
  if (match.type === LobbyType.RECURRING_SQUAD) return match.title;
  if (match.roster[0]?.name) return match.roster[0].name;
  return match.title;
}

/** Featured / sport-feed card — EventCard tokens + Lobby hub layout. */
export function LobbyActivityCard({ match, onView, busyId = null }: LobbyActivityCardProps) {
  const busy = busyId === match.id;
  const roster = (match.teamA ?? match.roster).slice(0, 4);
  const title = displayTitle(match);
  const isPlayerSeek =
    match.type === LobbyType.SINGLE_PLAYER_1 && match.playersFilled <= 1 && roster.length <= 1;

  return (
    <article className="rounded-xl border border-outline-variant/15 bg-surface-container-low p-4 transition-colors hover:border-outline-variant/35">
      {isPlayerSeek ? (
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            {roster[0] ? (
              <div className="h-12 w-12 overflow-hidden rounded-full border border-outline-variant/25">
                {roster[0].image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={roster[0].image}
                    alt={roster[0].name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-surface-container-highest text-xs font-semibold text-zinc-400">
                    {roster[0].name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-headline-md text-[16px] font-semibold tracking-wide text-white">
              {title}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-on-surface-variant">
              <Signal className="h-3.5 w-3.5 text-primary-container" aria-hidden />
              {skillLabelShort(match.skillLevel)}
            </p>
          </div>
          <ViewAction matchId={match.id} busy={busy} onView={onView} />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <span className="rounded-md bg-primary-container px-2 py-0.5 font-label-caps text-[10px] font-bold uppercase tracking-wider text-white">
              {match.sport}
            </span>
            <span className="rounded-full border border-white/10 bg-surface-container-highest/80 px-2.5 py-1 font-label-caps text-[10px] uppercase tracking-wider text-zinc-300">
              {match.playersFilled}/{match.playersTotal} SPOTS
            </span>
          </div>

          <div className="min-w-0 space-y-1">
            <h3 className="font-headline-md text-[17px] font-semibold leading-snug tracking-wide text-on-background">
              {title}
            </h3>
            <p className="flex items-center gap-1.5 text-[13px] text-on-surface-variant">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
              <span className="truncate">{match.venueName}</span>
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-white/5 pt-3">
            <div className="flex items-center -space-x-2">
              {roster.map((p) => (
                <Avatar key={p.id} player={p} />
              ))}
            </div>
            <ViewAction matchId={match.id} busy={busy} onView={onView} />
          </div>
        </div>
      )}
    </article>
  );
}

function ViewAction({
  matchId,
  busy,
  onView,
}: {
  matchId: string;
  busy: boolean;
  onView?: (id: string) => void;
}) {
  const className =
    'shrink-0 rounded-xl border border-white/10 bg-zinc-900/60 px-3.5 py-2 font-label-caps text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-container transition hover:border-primary-container/40 hover:bg-zinc-900/80 hover:text-primary active:scale-[0.98] disabled:opacity-60';

  if (onView) {
    return (
      <button type="button" onClick={() => onView(matchId)} disabled={busy} className={className}>
        {busy ? '…' : 'VIEW'}
      </button>
    );
  }

  return (
    <Link href={`/lobby/${matchId}`} className={className}>
      VIEW
    </Link>
  );
}
