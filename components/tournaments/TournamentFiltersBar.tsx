'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, ChevronLeft, ChevronRight, Trophy, X } from 'lucide-react';
import { EVENT_SPORTS, sportDisplayLabel } from '@/lib/constants/sports';
import {
  buildMonthGrid,
  calendarDateKey,
  formatRangeLabel,
  parseDateKey,
  parseEventDateRange,
  presetRange,
  resolveDatePreset,
  toDateKey,
  type DatePreset,
  type EventDateRange,
} from '@/lib/event-date-filter';
import type { TournamentStatusFilter } from '@/components/tournaments/TournamentFilterChips';

interface TournamentFiltersBarProps {
  statusFilter: TournamentStatusFilter;
  selectedSports?: string[];
  availableSports?: string[];
  eventDayKeys?: string[];
}

const STATUS_SEGMENTS: Array<{ key: TournamentStatusFilter; label: string }> = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'open', label: 'Open' },
  { key: 'live', label: 'Live' },
  { key: 'ALL', label: 'All' },
];

const DATE_PRESETS: Array<{ key: Exclude<DatePreset, 'all' | 'custom'>; label: string }> = [
  { key: 'today', label: 'Dnes' },
  { key: 'tomorrow', label: 'Zajtra' },
  { key: 'weekend', label: 'Víkend' },
];

function dateTriggerLabel(preset: DatePreset, range: EventDateRange): string {
  if (preset === 'all') return 'Kedy';
  if (preset === 'today') return 'Dnes';
  if (preset === 'tomorrow') return 'Zajtra';
  if (preset === 'weekend') return 'Víkend';
  return formatRangeLabel(range) || 'Kalendár';
}

export function TournamentFiltersBar({
  statusFilter,
  selectedSports = [],
  availableSports,
  eventDayKeys = [],
}: TournamentFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const range = useMemo(
    () =>
      parseEventDateRange({
        from: searchParams.get('from') ?? undefined,
        to: searchParams.get('to') ?? undefined,
      }),
    [searchParams],
  );
  const preset = resolveDatePreset(range);
  const daysWithEvents = useMemo(() => new Set(eventDayKeys), [eventDayKeys]);
  const selected = useMemo(
    () => new Set(selectedSports.map((s) => s.toUpperCase())),
    [selectedSports],
  );

  const sportKeys =
    availableSports && availableSports.length > 0
      ? availableSports.map((s) => s.toUpperCase())
      : [...EVENT_SPORTS];

  const [dateOpen, setDateOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [draft, setDraft] = useState<EventDateRange>(range);
  const [cursor, setCursor] = useState(() => {
    const anchor = parseDateKey(range.from ?? toDateKey(new Date())) ?? new Date();
    return { year: anchor.getFullYear(), month: anchor.getMonth() };
  });

  function withParams(mutate: (params: URLSearchParams) => void): string {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const pushRange = useCallback(
    (next: EventDateRange) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!next.from) {
        params.delete('from');
        params.delete('to');
      } else {
        params.set('from', next.from);
        const to = next.to ?? next.from;
        if (to === next.from) params.delete('to');
        else params.set('to', to);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const applyPreset = (key: Exclude<DatePreset, 'custom'>) => {
    setCalendarOpen(false);
    if (key === 'all') {
      pushRange({ from: null, to: null });
      setDateOpen(false);
      return;
    }
    pushRange(presetRange(key));
    setDateOpen(false);
  };

  const openCalendar = () => {
    setDraft(range.from ? range : { from: null, to: null });
    const anchor = parseDateKey(range.from ?? toDateKey(new Date())) ?? new Date();
    setCursor({ year: anchor.getFullYear(), month: anchor.getMonth() });
    setCalendarOpen(true);
    setDateOpen(true);
  };

  const onDayClick = (date: Date) => {
    const key = calendarDateKey(date.getFullYear(), date.getMonth(), date.getDate());
    if (!draft.from || (draft.from && draft.to && draft.from !== draft.to)) {
      setDraft({ from: key, to: key });
      return;
    }
    if (key < draft.from) setDraft({ from: key, to: draft.from });
    else setDraft({ from: draft.from, to: key });
  };

  const applyDraft = () => {
    pushRange(draft.from ? { from: draft.from, to: draft.to ?? draft.from } : { from: null, to: null });
    setCalendarOpen(false);
    setDateOpen(false);
  };

  const clearDates = () => {
    pushRange({ from: null, to: null });
    setCalendarOpen(false);
    setDateOpen(false);
  };

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('sk-SK', {
    month: 'long',
    year: 'numeric',
  });
  const grid = buildMonthGrid(cursor.year, cursor.month);
  const todayKey = toDateKey(new Date());
  const draftFrom = draft.from;
  const draftTo = draft.to ?? draft.from;
  const dateActive = preset !== 'all';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 rounded-xl border border-[#c4a035]/25 bg-[#14120e]/95 p-1.5 min-w-0">
        <div
          className="relative flex min-w-0 flex-1 overflow-x-auto hide-scrollbar rounded-lg bg-surface-container-lowest/80 p-0.5"
          role="tablist"
          aria-label="Tournament status"
        >
          {STATUS_SEGMENTS.map((seg) => {
            const active = statusFilter === seg.key;
            return (
              <Link
                key={seg.key}
                href={withParams((params) => {
                  if (seg.key === 'upcoming') params.delete('status');
                  else params.set('status', seg.key === 'ALL' ? 'all' : seg.key);
                })}
                scroll={false}
                role="tab"
                aria-selected={active}
                className={[
                  'flex-1 rounded-md px-1 py-2 text-center font-label-caps text-[8px] uppercase tracking-[0.08em] transition-colors sm:px-1.5 sm:text-[10px] sm:tracking-[0.12em]',
                  active
                    ? 'bg-[#c4a035]/20 text-[#e8d59a] shadow-[0_4px_14px_rgba(196,160,53,0.18)] ring-1 ring-[#c4a035]/35'
                    : 'text-on-surface-variant hover:text-on-surface',
                ].join(' ')}
              >
                {seg.label}
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          aria-expanded={dateOpen}
          aria-label="Filter by date"
          onClick={() => {
            setDateOpen((v) => !v);
            if (dateOpen) setCalendarOpen(false);
          }}
          className={[
            'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 font-label-caps text-[10px] uppercase tracking-[0.12em] transition-colors',
            dateActive || dateOpen
              ? 'border border-[#c4a035]/40 bg-[#c4a035]/15 text-[#e8d59a]'
              : 'border border-[#c4a035]/20 text-on-surface-variant hover:border-[#c4a035]/35 hover:text-[#e8d59a]',
          ].join(' ')}
        >
          <CalendarDays className="h-3.5 w-3.5" strokeWidth={2.25} />
          <span className="max-w-[72px] truncate sm:max-w-none">{dateTriggerLabel(preset, range)}</span>
        </button>
      </div>

      {dateOpen && (
        <div className="space-y-3 rounded-xl border border-[#c4a035]/25 bg-[#14120e] p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => applyPreset('all')}
              className={[
                'rounded-full px-3 py-1.5 font-label-caps text-[10px] uppercase tracking-[0.12em] transition-colors',
                preset === 'all'
                  ? 'bg-[#c4a035]/20 text-[#e8d59a] ring-1 ring-[#c4a035]/40'
                  : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface',
              ].join(' ')}
            >
              Všetky
            </button>
            {DATE_PRESETS.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => applyPreset(chip.key)}
                className={[
                  'rounded-full px-3 py-1.5 font-label-caps text-[10px] uppercase tracking-[0.12em] transition-colors',
                  preset === chip.key
                    ? 'bg-[#c4a035]/20 text-[#e8d59a] ring-1 ring-[#c4a035]/40'
                    : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface',
                ].join(' ')}
              >
                {chip.label}
              </button>
            ))}
            <button
              type="button"
              onClick={openCalendar}
              className={[
                'inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-label-caps text-[10px] uppercase tracking-[0.12em] transition-colors',
                preset === 'custom' || calendarOpen
                  ? 'bg-[#c4a035]/20 text-[#e8d59a] ring-1 ring-[#c4a035]/40'
                  : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface',
              ].join(' ')}
            >
              Kalendár
            </button>
            {dateActive && (
              <button
                type="button"
                aria-label="Zrušiť dátum"
                onClick={clearDates}
                className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-full text-on-surface-variant hover:text-[#e8d59a]"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.25} />
              </button>
            )}
          </div>

          {calendarOpen && (
            <div className="space-y-3 border-t border-[#c4a035]/15 pt-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  aria-label="Predchádzajúci mesiac"
                  onClick={() =>
                    setCursor((c) => {
                      const m = c.month - 1;
                      return m < 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: m };
                    })
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#c4a035]/30 text-[#e8d59a]"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                </button>
                <p className="font-headline-md text-sm capitalize text-on-background">{monthLabel}</p>
                <button
                  type="button"
                  aria-label="Ďalší mesiac"
                  onClick={() =>
                    setCursor((c) => {
                      const m = c.month + 1;
                      return m > 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: m };
                    })
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#c4a035]/30 text-[#e8d59a]"
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].map((d) => (
                  <span
                    key={d}
                    className="py-1 font-label-caps text-[9px] uppercase tracking-[0.12em] text-outline"
                  >
                    {d}
                  </span>
                ))}
                {grid.map((date, i) => {
                  if (!date) return <span key={`e-${i}`} className="h-9" />;
                  const key = calendarDateKey(date.getFullYear(), date.getMonth(), date.getDate());
                  const inRange = Boolean(draftFrom && draftTo && key >= draftFrom && key <= draftTo);
                  const isEdge = key === draftFrom || key === draftTo;
                  const isToday = key === todayKey;
                  const hasEvents = daysWithEvents.has(key);

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onDayClick(date)}
                      className={[
                        'relative flex h-9 flex-col items-center justify-center rounded-lg font-headline-md text-[13px] transition-colors',
                        inRange ? 'bg-[#c4a035]/20 text-on-background' : 'text-on-surface-variant hover:bg-surface-container-high',
                        isEdge && 'bg-[#c4a035]/35 text-[#e8d59a] ring-1 ring-[#c4a035]/50',
                        isToday && !inRange && 'ring-1 ring-[#c4a035]/40',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {date.getDate()}
                      {hasEvents && (
                        <span
                          className={`absolute bottom-1 h-1 w-1 rounded-full ${
                            isEdge ? 'bg-[#e8d59a]' : 'bg-[#c4a035]'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCalendarOpen(false)}
                  className="rounded-xl border border-outline-variant/25 px-3 py-2 font-label-caps text-[10px] uppercase tracking-[0.12em] text-on-surface-variant"
                >
                  Zavrieť
                </button>
                <button
                  type="button"
                  onClick={applyDraft}
                  disabled={!draft.from}
                  className="rounded-xl bg-[#c4a035]/25 px-3 py-2 font-label-caps text-[10px] uppercase tracking-[0.12em] text-[#e8d59a] ring-1 ring-[#c4a035]/40 disabled:opacity-40"
                >
                  Použiť
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <section
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overscroll-x-contain hide-scrollbar touch-pan-x py-0.5"
          aria-label="Sport"
        >
          <Link
            href={withParams((params) => {
              params.delete('sport');
            })}
            scroll={false}
            className={[
              'snap-start shrink-0 rounded-md px-1.5 py-1 font-label-caps text-[9px] uppercase tracking-[0.14em] transition-colors',
              selected.size === 0 ? 'text-[#e8d59a]' : 'text-outline hover:text-on-surface-variant',
            ].join(' ')}
          >
            Športy
          </Link>
          {sportKeys.length > 0 && <span className="shrink-0 text-outline-variant/50">·</span>}
          {sportKeys.map((sport) => {
            const active = selected.has(sport);
            return (
              <Link
                key={sport}
                href={withParams((params) => {
                  const upper = sport.toUpperCase();
                  const next = selected.has(upper)
                    ? [...selected].filter((s) => s !== upper)
                    : [...selected, upper];
                  if (next.length === 0) params.delete('sport');
                  else params.set('sport', next.join(','));
                })}
                scroll={false}
                className={[
                  'snap-start shrink-0 rounded-md px-1.5 py-1 font-label-caps text-[9px] uppercase tracking-[0.12em] transition-colors',
                  active
                    ? 'bg-[#c4a035]/15 text-[#e8d59a]'
                    : 'text-on-surface-variant/80 hover:text-on-surface',
                ].join(' ')}
              >
                {sportDisplayLabel(sport)}
              </Link>
            );
          })}
        </section>

        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#c4a035]/30 bg-[#c4a035]/10 px-2 py-1 font-label-caps text-[8px] uppercase tracking-[0.12em] text-[#e8d59a]">
          <Trophy className="h-3 w-3" strokeWidth={2.25} />
          Cups
        </span>
      </div>
    </div>
  );
}
