'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { EVENT_SPORTS, sportDisplayLabel } from '@/lib/constants/sports';
import { useT } from '@/components/i18n/LocaleProvider';
import type { MessageKey } from '@/lib/i18n/messages';

export type TournamentStatusFilter = 'upcoming' | 'open' | 'live' | 'ALL';

interface TournamentFilterChipsProps {
  statusFilter?: TournamentStatusFilter;
  selectedSports?: string[];
}

const STATUS_KEYS: Array<{ key: TournamentStatusFilter; labelKey: MessageKey }> = [
  { key: 'upcoming', labelKey: 'filter.upcoming' },
  { key: 'open', labelKey: 'filter.openReg' },
  { key: 'live', labelKey: 'filter.live' },
  { key: 'ALL', labelKey: 'filter.allCups' },
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
  const t = useT();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefForStatus(key: TournamentStatusFilter): string {
    const params = new URLSearchParams(searchParams.toString());
    if (key === 'upcoming') params.delete('status');
    else params.set('status', key === 'ALL' ? 'all' : key);
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function hrefForSport(sport: string): string {
    const params = new URLSearchParams(searchParams.toString());
    const current = new Set(
      (params.get('sport') ?? '')
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    );
    if (current.has(sport)) current.delete(sport);
    else current.add(sport);
    if (current.size === 0) params.delete('sport');
    else params.set('sport', [...current].join(','));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const selected = new Set(selectedSports.map((s) => s.toUpperCase()));

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain hide-scrollbar touch-pan-x py-0.5">
        {STATUS_KEYS.map((chip) => {
          const active = statusFilter === chip.key;
          return (
            <Link
              key={chip.key}
              href={hrefForStatus(chip.key)}
              className={`${CHIP} ${active ? CHIP_ACTIVE : CHIP_IDLE}`}
              scroll={false}
            >
              {t(chip.labelKey)}
            </Link>
          );
        })}
      </div>
      <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain hide-scrollbar touch-pan-x py-0.5">
        {EVENT_SPORTS.map((sport) => {
          const active = selected.has(sport);
          return (
            <Link
              key={sport}
              href={hrefForSport(sport)}
              className={`${CHIP} ${active ? CHIP_ACTIVE : CHIP_IDLE}`}
              scroll={false}
            >
              {sportDisplayLabel(sport)}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
