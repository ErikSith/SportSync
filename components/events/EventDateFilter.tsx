'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
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

const CHIP =
  'snap-start shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 font-label-caps text-[10px] uppercase tracking-[0.12em] whitespace-nowrap transition-all duration-200';

const CHIP_ACTIVE =
  'bg-primary-container text-on-primary-container shadow-[0_6px_18px_rgba(200,75,36,0.25)]';

const CHIP_IDLE =
  'bg-surface-container-high/80 text-on-surface-variant border border-outline-variant/25 hover:text-on-surface hover:border-primary-container/35 hover:bg-surface-container-highest';

const PRESET_CHIPS: Array<{ key: Exclude<DatePreset, 'custom'>; label: string }> = [
  { key: 'all', label: 'Všetky' },
  { key: 'today', label: 'Dnes' },
  { key: 'tomorrow', label: 'Zajtra' },
  { key: 'weekend', label: 'Víkend' },
];

interface EventDateFilterProps {
  /** YYYY-MM-DD keys that have at least one event (for day dots). */
  eventDayKeys?: string[];
}

export function EventDateFilter({ eventDayKeys = [] }: EventDateFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const range = useMemo(
    () => parseEventDateRange({ from: searchParams.get('from') ?? undefined, to: searchParams.get('to') ?? undefined }),
    [searchParams],
  );
  const preset = resolveDatePreset(range);
  const daysWithEvents = useMemo(() => new Set(eventDayKeys), [eventDayKeys]);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<EventDateRange>(range);
  const [cursor, setCursor] = useState(() => {
    const anchor = parseDateKey(range.from ?? toDateKey(new Date())) ?? new Date();
    return { year: anchor.getFullYear(), month: anchor.getMonth() };
  });

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
    setOpen(false);
    if (key === 'all') {
      pushRange({ from: null, to: null });
      return;
    }
    pushRange(presetRange(key));
  };

  const openCalendar = () => {
    setDraft(range.from ? range : { from: null, to: null });
    const anchor = parseDateKey(range.from ?? toDateKey(new Date())) ?? new Date();
    setCursor({ year: anchor.getFullYear(), month: anchor.getMonth() });
    setOpen(true);
  };

  const onDayClick = (date: Date) => {
    const key = calendarDateKey(date.getFullYear(), date.getMonth(), date.getDate());
    if (!draft.from || (draft.from && draft.to && draft.from !== draft.to)) {
      setDraft({ from: key, to: key });
      return;
    }
    // Second tap — complete range
    if (key < draft.from) setDraft({ from: key, to: draft.from });
    else setDraft({ from: draft.from, to: key });
  };

  const applyDraft = () => {
    pushRange(draft.from ? { from: draft.from, to: draft.to ?? draft.from } : { from: null, to: null });
    setOpen(false);
  };

  const clearDates = () => {
    pushRange({ from: null, to: null });
    setOpen(false);
  };

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('sk-SK', {
    month: 'long',
    year: 'numeric',
  });
  const grid = buildMonthGrid(cursor.year, cursor.month);
  const todayKey = toDateKey(new Date());
  const draftFrom = draft.from;
  const draftTo = draft.to ?? draft.from;

  return (
    <div className="flex flex-col gap-2.5">
      <section
        className="flex gap-2 overflow-x-auto overscroll-x-contain hide-scrollbar touch-pan-x py-0.5 -mx-1 px-1 snap-x snap-mandatory"
        aria-label="Dátum"
      >
        {PRESET_CHIPS.map((chip) => {
          const active = preset === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => applyPreset(chip.key)}
              className={`${CHIP} ${active ? CHIP_ACTIVE : CHIP_IDLE}`}
            >
              {chip.label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={openCalendar}
          className={`${CHIP} ${preset === 'custom' || open ? CHIP_ACTIVE : CHIP_IDLE}`}
        >
          <CalendarDays className="h-3.5 w-3.5" strokeWidth={2.25} />
          Kalendár
        </button>
      </section>

      {preset === 'custom' && range.from && !open && (
        <div className="flex items-center gap-2 pl-1">
          <span className="font-label-caps text-[10px] uppercase tracking-[0.14em] text-primary">
            {formatRangeLabel(range)}
          </span>
          <button
            type="button"
            aria-label="Zrušiť dátumový filter"
            onClick={clearDates}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-outline-variant/25 text-on-surface-variant transition-colors hover:border-primary-container/40 hover:text-primary-container"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.25} />
          </button>
        </div>
      )}

      {open && (
        <div className="glass-card space-y-3 rounded-xl p-3.5 sm:p-4">
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
              className="flex h-8 w-8 items-center justify-center rounded-full border border-primary-container/25 text-primary transition-colors hover:bg-primary-container/10"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </button>
            <p className="font-headline-md text-sm capitalize tracking-wide text-on-background">
              {monthLabel}
            </p>
            <button
              type="button"
              aria-label="Ďalší mesiac"
              onClick={() =>
                setCursor((c) => {
                  const m = c.month + 1;
                  return m > 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: m };
                })
              }
              className="flex h-8 w-8 items-center justify-center rounded-full border border-primary-container/25 text-primary transition-colors hover:bg-primary-container/10"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          <p className="font-body-md text-[11px] text-on-surface-variant">
            Ťukni deň, alebo dva dni pre rozsah
            {draftFrom ? (
              <>
                {' '}
                · <span className="text-primary">{formatRangeLabel({ from: draftFrom, to: draftTo })}</span>
              </>
            ) : null}
          </p>

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
              const inRange =
                draftFrom && draftTo && key >= draftFrom && key <= draftTo;
              const isStart = key === draftFrom;
              const isEnd = key === draftTo;
              const isToday = key === todayKey;
              const hasEvents = daysWithEvents.has(key);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onDayClick(date)}
                  className={[
                    'relative flex h-9 flex-col items-center justify-center rounded-lg font-headline-md text-[13px] transition-colors',
                    inRange ? 'bg-primary-container/25 text-on-background' : 'text-on-surface-variant hover:bg-surface-container-high',
                    (isStart || isEnd) && 'bg-primary-container text-on-primary-container shadow-[0_4px_12px_rgba(200,75,36,0.3)]',
                    isToday && !inRange && 'ring-1 ring-primary-container/50',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {date.getDate()}
                  {hasEvents && (
                    <span
                      className={`absolute bottom-1 h-1 w-1 rounded-full ${
                        isStart || isEnd ? 'bg-on-primary-container' : 'bg-primary-container'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                clearDates();
              }}
              className="font-label-caps text-[10px] uppercase tracking-[0.12em] text-on-surface-variant transition-colors hover:text-primary"
            >
              Zrušiť
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-outline-variant/25 px-3.5 py-2 font-label-caps text-[10px] uppercase tracking-[0.12em] text-on-surface-variant transition-colors hover:border-outline-variant/40"
              >
                Zavrieť
              </button>
              <button
                type="button"
                onClick={applyDraft}
                disabled={!draft.from}
                className="rounded-xl bg-primary-container px-3.5 py-2 font-label-caps text-[10px] uppercase tracking-[0.12em] text-on-primary-container transition-colors hover:bg-primary hover:text-on-primary disabled:pointer-events-none disabled:opacity-40"
              >
                Použiť
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
