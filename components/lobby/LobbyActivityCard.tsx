'use client';

import Link from 'next/link';
import type { MatchCardData } from '@/types/lobby';
import { LobbyType } from '@/types/lobby';
import {
  sportIconAccent,
  sportToIconKind,
} from '@/components/lobby/lobby-ui';
import { SportLinearIcon } from '@/components/lobby/SportLinearIcon';
import { sportColor } from '@/lib/utils/sport-icons';

interface LobbyActivityCardProps {
  match: MatchCardData;
  onView?: (id: string) => void;
  busyId?: string | null;
}

function typeHint(type: LobbyType): string {
  switch (type) {
    case LobbyType.TEAM_VS_TEAM:
      return 'Výzva';
    case LobbyType.RECURRING_SQUAD:
      return 'Partia';
    default:
      return '+1';
  }
}

/**
 * Dense lobby tile — sport, open seats, and kickoff first.
 * Built for packing many lobbies into Featured / sport feeds.
 */
export function LobbyActivityCard({ match, onView, busyId = null }: LobbyActivityCardProps) {
  const busy = busyId === match.id;
  const open = Math.max(0, match.playersTotal - match.playersFilled);
  const kind = sportToIconKind(match.sport, match.title);
  const tint = sportColor(match.sport, match.title);
  const accent = sportIconAccent(kind);
  const when = `${match.dateLabel} ${match.timeLabel}`.trim();

  const className = [
    'group flex w-full flex-col gap-1.5 rounded-2xl border border-white/[0.06] bg-[#1F1F1F] p-3 text-left transition',
    'hover:border-[#FF5722]/40 hover:bg-[#262626] active:scale-[0.99]',
    busy ? 'opacity-60' : '',
  ].join(' ');

  const body = (
    <>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#121212] ring-1 ring-white/[0.06]">
          <SportLinearIcon
            kind={kind}
            accent={accent}
            color={tint}
            strokeWidth={2}
            className="h-5 w-5 opacity-100"
          />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[13px] font-bold uppercase tracking-wide text-white">
              {match.sport}
            </p>
            <span
              className={`shrink-0 font-label-caps text-[11px] font-bold tracking-[0.08em] ${
                open > 0 ? 'text-[#FF5722]' : 'text-gray-500'
              }`}
            >
              {open > 0 ? `+${open}` : 'Full'}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-gray-400">
            <span className="text-gray-300">{when}</span>
            <span className="mx-1 text-white/15">·</span>
            <span>
              {match.playersFilled}/{match.playersTotal}
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-white/[0.05] pt-1.5">
        <p className="min-w-0 truncate text-[10px] text-gray-500">{match.venueName}</p>
        <span className="shrink-0 font-label-caps text-[8px] uppercase tracking-[0.12em] text-[#FF7F50]/80">
          {typeHint(match.type)}
        </span>
      </div>
    </>
  );

  if (onView) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => onView(match.id)}
        className={className}
        aria-label={`${match.sport}, ${open > 0 ? `chýba ${open}` : 'plné'}, ${when}`}
      >
        {body}
      </button>
    );
  }

  return (
    <Link
      href={`/lobby/${match.id}`}
      className={className}
      aria-label={`${match.sport}, ${open > 0 ? `chýba ${open}` : 'plné'}, ${when}`}
    >
      {body}
    </Link>
  );
}
