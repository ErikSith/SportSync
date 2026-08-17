'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { EVENT_SPORTS, sportDisplayLabel } from '@/lib/constants/sports';

interface VenueFilterChipsProps {
  selectedSports?: string[];
}

const CHIP =
  'snap-start shrink-0 rounded-full px-2.5 py-1 font-label-caps text-[10px] uppercase tracking-wide whitespace-nowrap transition-colors';
const CHIP_ACTIVE = 'bg-tertiary-container text-on-tertiary-container';
const CHIP_IDLE =
  'glass-card text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-tertiary/25';

export function VenueFilterChips({
  selectedSports = [],
}: VenueFilterChipsProps) {
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
    <section
      className="mb-1 flex gap-1.5 overflow-x-auto overscroll-x-contain hide-scrollbar touch-pan-x py-0.5 -mx-1 px-1 snap-x snap-mandatory"
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
  );
}
