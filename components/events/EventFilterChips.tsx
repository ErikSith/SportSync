'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { EventType } from '@/lib/constants/events';
import { EVENT_SPORTS, sportDisplayLabel } from '@/lib/constants/sports';

interface EventFilterChipsProps {
  typeFilter: EventType | 'ALL';
  /** Sports currently selected in the URL (?sport=FITNESS,FOOTBALL). */
  selectedSports?: string[];
}

const TYPE_CHIPS: Array<{ key: EventType | 'ALL'; label: string; icon: string }> = [
  { key: 'ALL', label: 'All', icon: 'apps' },
  { key: 'official', label: 'Official', icon: 'verified' },
  { key: 'community', label: 'Community', icon: 'groups' },
];

const CHIP =
  'snap-start shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 font-label-caps text-[10px] uppercase tracking-[0.12em] whitespace-nowrap transition-all duration-200';

const CHIP_ACTIVE =
  'border border-primary-container/35 bg-zinc-900/80 text-white shadow-[0_0_14px_rgba(200,75,36,0.1)]';

const CHIP_IDLE =
  'border border-white/5 bg-zinc-900/40 text-zinc-400 hover:border-white/10 hover:bg-zinc-900/60 hover:text-zinc-300';

export function EventFilterChips({
  typeFilter,
  selectedSports = [],
}: EventFilterChipsProps) {
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

  function hrefForType(type: EventType | 'ALL'): string {
    return withParams((params) => {
      if (type === 'ALL') params.delete('type');
      else params.set('type', type);
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
    <div className="flex flex-col gap-3">
      <section
        className="flex gap-2 overflow-x-auto overscroll-x-contain hide-scrollbar touch-pan-x py-0.5 -mx-1 px-1 snap-x snap-mandatory"
        aria-label="Event type"
      >
        {TYPE_CHIPS.map((chip) => {
          const active = typeFilter === chip.key;
          return (
            <Link
              key={chip.key}
              href={hrefForType(chip.key)}
              scroll={false}
              className={`${CHIP} ${active ? CHIP_ACTIVE : CHIP_IDLE}`}
            >
              <span
                className="material-symbols-outlined text-[14px]"
                style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {chip.icon}
              </span>
              {chip.label}
            </Link>
          );
        })}
      </section>

      <section
        className="flex gap-2 overflow-x-auto overscroll-x-contain hide-scrollbar touch-pan-x py-0.5 -mx-1 px-1 snap-x snap-mandatory"
        aria-label="Sport"
      >
        <Link
          href={hrefClearSports()}
          scroll={false}
          className={`${CHIP} ${selected.size === 0 ? CHIP_ACTIVE : CHIP_IDLE}`}
        >
          All sports
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
