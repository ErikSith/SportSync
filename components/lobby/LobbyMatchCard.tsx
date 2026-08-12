'use client';

import { Clock, MapPin, Plus, Users } from 'lucide-react';
import type { MatchCardData, PlayerAvatar } from '@/types/lobby';
import { LobbyType } from '@/types/lobby';
import { skillLabel } from '@/components/lobby/lobby-ui';

interface LobbyMatchCardProps {
  match: MatchCardData;
  onAction: (id: string) => void;
  busyId: string | null;
}

function typeMeta(type: LobbyType): { label: string; hint: string } {
  switch (type) {
    case LobbyType.TEAM_VS_TEAM:
      return { label: 'Challenge', hint: 'Team vs team' };
    case LobbyType.RECURRING_SQUAD:
      return { label: 'Recurring', hint: 'Standing group' };
    default:
      return { label: '+1', hint: 'Needs a partner' };
  }
}

function Avatar({ player }: { player: PlayerAvatar }) {
  return (
    <div
      title={player.name}
      className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border-2 border-surface-container-low bg-surface-container-high"
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

function OpenSlot({ label = '+' }: { label?: string }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-outline-variant/40 bg-background text-[10px] font-medium text-zinc-500">
      {label}
    </div>
  );
}

export function LobbyMatchCard({ match, onAction, busyId }: LobbyMatchCardProps) {
  const busy = busyId === match.id;
  const meta = typeMeta(match.type);
  const openSlots = Math.max(0, match.playersTotal - match.playersFilled);
  const title =
    match.type === LobbyType.TEAM_VS_TEAM
      ? match.teamName ?? match.title
      : match.type === LobbyType.RECURRING_SQUAD
        ? match.title
        : `${match.sport} · ${meta.hint}`;

  const roster = (match.teamA ?? match.roster).slice(0, 5);
  const timeLine =
    match.type === LobbyType.RECURRING_SQUAD && match.recurringNote
      ? match.recurringNote
      : `${match.dateLabel} ${match.timeLabel}`;

  const statusLine =
    match.type === LobbyType.RECURRING_SQUAD
      ? match.squadStatus ?? match.substituteLabel ?? `${openSlots} open spot${openSlots === 1 ? '' : 's'}`
      : match.type === LobbyType.TEAM_VS_TEAM
        ? match.challengeTerms ?? match.teamRecord ?? 'Open challenge'
        : `${skillLabel(match.skillLevel)} · ${openSlots} open`;

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-container-low transition-colors hover:border-outline-variant/35">
      <div className="h-0.5 w-full bg-primary-container/70" aria-hidden />

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-primary/25 bg-surface-container-highest/80 px-1.5 py-0.5 font-label-caps text-[9px] uppercase tracking-wider text-primary">
                {match.sport}
              </span>
              <span className="rounded-full border border-white/10 bg-zinc-900/50 px-1.5 py-0.5 font-label-caps text-[9px] uppercase tracking-wider text-zinc-400">
                {meta.label}
              </span>
              {match.type === LobbyType.TEAM_VS_TEAM && match.teamRecord ? (
                <span className="font-label-caps text-[9px] uppercase tracking-wider text-zinc-500">
                  {match.teamRecord}
                </span>
              ) : null}
            </div>
            <h3 className="font-headline-md text-[17px] leading-snug tracking-wide text-on-background transition-colors group-hover:text-primary">
              {title}
            </h3>
          </div>

          <span className="shrink-0 rounded-full border border-white/10 bg-zinc-900/50 px-2 py-1 font-label-caps text-[9px] uppercase tracking-wider text-zinc-300">
            {match.playersFilled}/{match.playersTotal}
          </span>
        </div>

        <div className="mt-3 space-y-1.5 text-[13px] text-on-surface-variant">
          <p className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            <span>{timeLine}</span>
            {match.distanceKm > 0 ? (
              <span className="text-zinc-600">· {match.distanceKm} km</span>
            ) : null}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            <span className="truncate">
              {match.venueName}
              {match.city ? ` · ${match.city}` : ''}
            </span>
          </p>
          <p className="flex items-start gap-2 text-zinc-500">
            <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{statusLine}</span>
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/5 pt-3">
          <div className="flex items-center -space-x-2">
            {roster.map((p) => (
              <Avatar key={p.id} player={p} />
            ))}
            {openSlots > 0 ? <OpenSlot label={openSlots === 1 ? '+1' : `+${Math.min(openSlots, 9)}`} /> : null}
            {openSlots === 0 ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-outline-variant/30">
                <Plus className="h-3 w-3 text-zinc-600" />
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => onAction(match.id)}
            disabled={busy}
            className="shrink-0 rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-1.5 font-label-caps text-[10px] uppercase tracking-[0.12em] text-zinc-200 transition hover:border-primary-container/35 hover:text-white active:scale-[0.98] disabled:opacity-60"
          >
            {busy
              ? '…'
              : match.type === LobbyType.TEAM_VS_TEAM
                ? 'Accept'
                : match.type === LobbyType.RECURRING_SQUAD
                  ? 'Request'
                  : 'Join'}
          </button>
        </div>

        {match.type === LobbyType.SINGLE_PLAYER_1 && (
          <p className="mt-3 text-[11px] leading-snug text-zinc-600">
            Court booking and payment are handled at the venue.
          </p>
        )}
      </div>
    </article>
  );
}
