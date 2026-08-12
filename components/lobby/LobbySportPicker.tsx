'use client';

import {
  LOBBY_SPORT_META,
  LOBBY_SPORT_ORDER,
  matchesLobbySport,
} from '@/components/lobby/lobby-ui';
import type { LobbySportKey, MatchCardData } from '@/types/lobby';

interface LobbySportPickerProps {
  matches: MatchCardData[];
  onSelect: (sport: LobbySportKey) => void;
}

function countLabel(key: LobbySportKey, count: number): string {
  const suffix = LOBBY_SPORT_META[key].countSuffix;
  return `${count} ${suffix}`;
}

/** Compact 2-col sport hub — dense on mobile, roomier from md up. */
export function LobbySportPicker({ matches, onSelect }: LobbySportPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-3 md:gap-2.5 lg:grid-cols-4">
      {LOBBY_SPORT_ORDER.map((key) => {
        const meta = LOBBY_SPORT_META[key];
        const count = matches.filter((m) => matchesLobbySport(m, key)).length;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className="glass-card group relative flex flex-col items-start gap-1.5 overflow-hidden rounded-xl p-2.5 text-left transition active:scale-[0.98] sm:gap-2 sm:p-3 md:gap-2.5 md:p-3.5"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary-container/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border border-transparent bg-surface-container shadow-inner transition-all group-hover:border-primary-container/35 group-hover:bg-primary-container/15 sm:h-9 sm:w-9">
              <span className="material-symbols-outlined text-[20px] text-primary-container sm:text-[22px]">
                {meta.materialIcon}
              </span>
            </div>
            <div className="relative z-10 min-w-0 space-y-0.5">
              <p className="truncate font-headline-md text-[13px] font-semibold tracking-wide text-on-surface transition-colors group-hover:text-white sm:text-[14px] md:text-[15px]">
                {meta.label}
              </p>
              <p className="line-clamp-1 text-[10px] leading-tight text-on-surface-variant/80 sm:text-[11px]">
                {countLabel(key, count)}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
