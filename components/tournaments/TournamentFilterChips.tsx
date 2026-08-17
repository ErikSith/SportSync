'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { EVENT_SPORTS, sportDisplayLabel } from '@/lib/constants/sports';

export type TournamentStatusFilter = 'upcoming' | 'open' | 'live' | 'ALL';

interface TournamentFilterChipsProps {
  statusFilter?: TournamentStatusFilter;
  selectedSports?: string[];
}

const STATUS_CHIPS: Array<{ key: TournamentStatusFilter; label: string }> = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'open', label: 'Open Reg' },
  { key: 'live', label: 'Live' },
  { key: 'ALL', label: 'All Cups' },
];

const CHIP =
  'snap-start shrink-0 rounded-full px-2.5 py-1 font-label-caps text-[10px] uppercase tracking-wide whitespace-nowrap transition-colors';
/** Gold active — distinguishes tournament filters from coral event chips. */
const CHIP_ACTIVE = 'bg-secondary text-on-secondary';
const CHIP_IDLE =
  'glass-card text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-secondary/20';

export function TournamentFilterChips({
  statusFilter = 'upcoming',
  selectedSports = [],
}: TournamentFilterChipsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sportKeys = [...EVENT_SPORTS];

  const selected = new Set(selectedSports.map((s) => s.toUpperCase()));

  function withParams(mutate: (params: URLSearchParams) => void): string {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function hrefForStatus(status: TournamentStatusFilter): string {
    return withParams((params) => {
      if (status === 'upcoming') params.delete('status');
      else params.set('status', status === 'ALL' ? 'all' : status);
    });
  }

  function hrefForSport(sport: string): string {
    return withParams((params) => {
      const upper = sport.toUpperCase();
      const next = selected.has(upper)
        ? [...selected].filter((s) => s !== upper)
        : [...selected, upper];
      if (next.length === 0) params.delete('sport');
      else params.set('sport', next.join(','));
    });
  }

  function hrefClearSports(): string {
    return withParams((params) => {
      params.delete('sport');
    });
  }

  return (
    <div className="flex flex-col gap-2 mb-1">
      <section
        className="flex gap-1.5 overflow-x-auto overscroll-x-contain hide-scrollbar touch-pan-x py-0.5 -mx-1 px-1 snap-x snap-mandatory"
        aria-label="Tournament status"
      >
        {STATUS_CHIPS.map((chip) => {
          const active = statusFilter === chip.key;
          return (
            <Link
              key={chip.key}
              href={hrefForStatus(chip.key)}
              scroll={false}
              className={`${CHIP} ${active ? CHIP_ACTIVE : CHIP_IDLE}`}
            >
              {chip.label}
            </Link>
          );
        })}
      </section>

      <section
        className="flex gap-1.5 overflow-x-auto overscroll-x-contain hide-scrollbar touch-pan-x py-0.5 -mx-1 px-1 snap-x snap-mandatory"
        aria-label="Sport"
      >
        <Link
          href={hrefClearSports()}
          scroll={false}
          className={`${CHIP} ${selected.size === 0 ? CHIP_ACTIVE : CHIP_IDLE}`}
        >
          All
        </Link>
        {sportKeys.map((sport) => {
          const active = selected.has(sport);
          return (
            <Link
              key={sport}
              href={hrefForSport(sport)}
              scroll={false}
              className={`${CHIP} ${active ? CHIP_ACTIVE : CHIP_IDLE}`}
            >
              {sportDisplayLabel(sport)}
            </Link>
          );
        })}
      </section>
    </div>
  );
}
