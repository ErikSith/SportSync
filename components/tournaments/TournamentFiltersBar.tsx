'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';
import { useT } from '@/components/i18n/LocaleProvider';
import type { ParticipationMode } from '@/lib/data/events';
import { EVENT_SPORTS, sportDisplayLabel } from '@/lib/constants/sports';
import { parseFeedArea, type FeedAreaId } from '@/lib/cities';
import {
  BRATISLAVA_BOROUGHS,
  type BratislavaDistrict,
} from '@/lib/scrape/bratislava-location';
import {
  parseHomeFeedFilters,
  saveHomeFeedFiltersToStorage,
} from '@/lib/home-feed-filters';
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
import {
  EVENT_AUDIENCE_OPTIONS,
  parseEventAudience,
  type EventAudience,
} from '@/lib/event-audience-filter';

interface TournamentFiltersBarProps {
  mode: ParticipationMode;
  selectedSports?: string[];
  eventDayKeys?: string[];
}

type FilterPanel = 'when' | 'where' | 'sport' | null;

const DATE_PRESETS: Array<{ key: Exclude<DatePreset, 'all' | 'custom'>; label: string }> = [
  { key: 'today', label: 'Dnes' },
  { key: 'tomorrow', label: 'Zajtra' },
  { key: 'weekend', label: 'Víkend' },
];

const OKRES_ORDER: BratislavaDistrict[] = [
  'Bratislava I',
  'Bratislava II',
  'Bratislava III',
  'Bratislava IV',
  'Bratislava V',
];

const BOROUGHS_BY_OKRES = OKRES_ORDER.map((okres) => ({
  okres,
  boroughs: BRATISLAVA_BOROUGHS.filter((b) => b.district === okres),
}));

function whereSummary(area: FeedAreaId): string {
  if (area === 'bratislava') return 'Kdekoľvek';
  if (area === 'near_me') return 'Blízko mňa';
  return BRATISLAVA_BOROUGHS.find((b) => b.slug === area)?.borough ?? 'Kdekoľvek';
}

export function TournamentFiltersBar({
  mode,
  selectedSports = [],
  eventDayKeys = [],
}: TournamentFiltersBarProps) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [modePending, startModeTransition] = useTransition();
  const isSpectator = mode === 'spectator';
  const [openPanel, setOpenPanel] = useState<FilterPanel>(null);

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
  const audience = parseEventAudience(searchParams.get('audience'));
  const area = parseFeedArea(searchParams.get('area'));

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [draft, setDraft] = useState<EventDateRange>(range);
  const [cursor, setCursor] = useState(() => {
    const anchor = parseDateKey(range.from ?? toDateKey(new Date())) ?? new Date();
    return { year: anchor.getFullYear(), month: anchor.getMonth() };
  });

  const replaceParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const persistArea = useCallback(
    (next: FeedAreaId) => {
      const current = parseHomeFeedFilters({
        sport: searchParams.get('sport') ?? undefined,
        venues: searchParams.get('venues') ?? undefined,
        type: searchParams.get('type') ?? undefined,
        area: next,
      });
      saveHomeFeedFiltersToStorage({ ...current, area: next });
    },
    [searchParams],
  );

  const setArea = useCallback(
    (next: FeedAreaId) => {
      persistArea(next);
      replaceParams((params) => {
        if (next === 'bratislava') params.delete('area');
        else params.set('area', next);
      });
    },
    [persistArea, replaceParams],
  );

  const setMode = useCallback(
    (next: ParticipationMode) => {
      startModeTransition(() => {
        replaceParams((params) => {
          if (next === 'participate') params.delete('mode');
          else params.set('mode', 'spectator');
        });
      });
    },
    [replaceParams],
  );

  const setAudience = useCallback(
    (next: EventAudience) => {
      replaceParams((params) => {
        if (next === 'all') params.delete('audience');
        else params.set('audience', next);
      });
    },
    [replaceParams],
  );

  const clearSports = useCallback(() => {
    replaceParams((params) => {
      params.delete('sport');
    });
  }, [replaceParams]);

  const toggleSport = useCallback(
    (sport: string) => {
      const upper = sport.toUpperCase();
      replaceParams((params) => {
        const current = new Set(
          (params.get('sport') ?? '')
            .split(',')
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean),
        );
        if (current.has(upper)) current.delete(upper);
        else current.add(upper);
        if (current.size === 0) params.delete('sport');
        else {
          params.set(
            'sport',
            EVENT_SPORTS.filter((s) => current.has(s)).join(','),
          );
        }
      });
    },
    [replaceParams],
  );

  const pushRange = useCallback(
    (next: EventDateRange) => {
      replaceParams((params) => {
        if (!next.from) {
          params.delete('from');
          params.delete('to');
        } else {
          params.set('from', next.from);
          const to = next.to ?? next.from;
          if (to === next.from) params.delete('to');
          else params.set('to', to);
        }
      });
    },
    [replaceParams],
  );

  const applyPreset = (key: Exclude<DatePreset, 'custom'>) => {
    setCalendarOpen(false);
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
    setCalendarOpen(true);
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
  };

  const togglePanel = (panel: Exclude<FilterPanel, null>) => {
    setOpenPanel((current) => {
      const next = current === panel ? null : panel;
      if (next !== 'when') setCalendarOpen(false);
      return next;
    });
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
  const customActive = preset === 'custom';
  const allSportsActive = selected.size === 0;

  const whenSummary =
    preset === 'all'
      ? 'Kedykoľvek'
      : preset === 'today'
        ? 'Dnes'
        : preset === 'tomorrow'
          ? 'Zajtra'
          : preset === 'weekend'
            ? 'Víkend'
            : formatRangeLabel(range) || 'Dátum';
  const sportSummary =
    selected.size === 1
      ? sportDisplayLabel([...selected][0]!)
      : selected.size > 1
        ? `${selected.size} športy`
        : 'Športy';
  const areaSummary = whereSummary(area);
  const areaActive = area !== 'bratislava';

  const chip =
    'inline-flex shrink-0 items-center rounded-xl border px-3 py-2 font-label-caps text-[9px] uppercase tracking-[0.12em] transition-colors duration-200 active:scale-[0.98] whitespace-nowrap';
  const chipIdle =
    'border-[#c4a035]/15 bg-transparent text-on-surface-variant hover:border-[#c4a035]/25 hover:bg-[#c4a035]/[0.04] hover:text-[#e8d59a]';
  const chipOn = 'border-[#c4a035]/25 bg-[#c4a035]/[0.08] text-[#e8d59a]';
  const scrollRow =
    'flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain hide-scrollbar touch-pan-x';

  const archTab = (opts: {
    id: Exclude<FilterPanel, null>;
    label: string;
    filtered: boolean;
  }) => {
    const open = openPanel === opts.id;
    return (
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`tournament-filter-panel-${opts.id}`}
        onClick={() => togglePanel(opts.id)}
        className={[
          'group flex h-full min-w-0 w-full items-center justify-center gap-1 rounded-xl px-1.5 py-2.5 text-center transition-colors duration-200 sm:gap-1.5 sm:px-2',
          open
            ? 'bg-[#c4a035]/[0.08] text-[#e8d59a]'
            : opts.filtered
              ? 'text-[#e8d59a] hover:bg-[#c4a035]/[0.04]'
              : 'text-on-surface-variant hover:bg-[#c4a035]/[0.04] hover:text-[#e8d59a]',
        ].join(' ')}
      >
        <span className="min-w-0 truncate font-label-caps text-[9px] uppercase tracking-[0.1em] sm:tracking-[0.12em]">
          {opts.label}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 opacity-60 transition-transform duration-200 ${
            open ? 'rotate-180 opacity-90' : ''
          }`}
          strokeWidth={2}
        />
      </button>
    );
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-2.5" data-tournament-filters-bar="v6-audience-mode-row">
      <div
        className="grid min-w-0 grid-cols-3 items-stretch gap-0 rounded-2xl border border-[#c4a035]/20 bg-transparent p-1 transition-colors duration-200"
        role="toolbar"
        aria-label="Filtre turnajov"
      >
        {archTab({ id: 'when', label: whenSummary, filtered: dateActive })}
        <div className="relative min-w-0">
          <span
            className="pointer-events-none absolute inset-y-1.5 left-0 w-px bg-[#c4a035]/20"
            aria-hidden
          />
          {archTab({ id: 'where', label: areaSummary, filtered: areaActive })}
        </div>
        <div className="relative min-w-0">
          <span
            className="pointer-events-none absolute inset-y-1.5 left-0 w-px bg-[#c4a035]/20"
            aria-hidden
          />
          {archTab({ id: 'sport', label: sportSummary, filtered: !allSportsActive })}
        </div>
      </div>

      <AnimatePresence initial={false} mode="wait">
        {openPanel ? (
          <motion.div
            key={openPanel}
            id={`tournament-filter-panel-${openPanel}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-[#c4a035]/20 bg-transparent px-3 py-3 space-y-2.5 sm:px-3.5">
              {openPanel === 'when' ? (
                <>
                  <div className={scrollRow} role="list" aria-label="Dátum">
                    <button
                      type="button"
                      onClick={() => applyPreset('all')}
                      className={`${chip} ${preset === 'all' ? chipOn : chipIdle}`}
                    >
                      Kedykoľvek
                    </button>
                    {DATE_PRESETS.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => applyPreset(item.key)}
                        className={`${chip} ${preset === item.key ? chipOn : chipIdle}`}
                      >
                        {item.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      aria-expanded={calendarOpen}
                      aria-label="Kalendár"
                      onClick={() => {
                        if (calendarOpen) setCalendarOpen(false);
                        else openCalendar();
                      }}
                      className={`${chip} ${customActive || calendarOpen ? chipOn : chipIdle}`}
                    >
                      <CalendarDays className="mr-1 h-3.5 w-3.5" strokeWidth={2} />
                      {customActive ? formatRangeLabel(range) || 'Dátum' : 'Dátum'}
                    </button>
                    {dateActive ? (
                      <button
                        type="button"
                        aria-label="Zrušiť dátum"
                        onClick={() => applyPreset('all')}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#c4a035]/15 text-on-surface-variant transition-colors hover:border-[#c4a035]/25 hover:bg-[#c4a035]/[0.04] hover:text-[#e8d59a]"
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    ) : null}
                  </div>

                  <AnimatePresence initial={false}>
                    {calendarOpen ? (
                      <motion.div
                        key="calendar"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="rounded-2xl border border-[#c4a035]/20 bg-transparent p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              aria-label="Predchádzajúci mesiac"
                              onClick={() =>
                                setCursor((c) => {
                                  const m = c.month - 1;
                                  return m < 0
                                    ? { year: c.year - 1, month: 11 }
                                    : { year: c.year, month: m };
                                })
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#c4a035]/15 text-[#c4a035]/85 transition-colors hover:border-[#c4a035]/25 hover:bg-[#c4a035]/[0.04]"
                            >
                              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                            </button>
                            <p className="font-headline-md text-xs capitalize text-[#e8d59a]">
                              {monthLabel}
                            </p>
                            <button
                              type="button"
                              aria-label="Ďalší mesiac"
                              onClick={() =>
                                setCursor((c) => {
                                  const m = c.month + 1;
                                  return m > 11
                                    ? { year: c.year + 1, month: 0 }
                                    : { year: c.year, month: m };
                                })
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#c4a035]/15 text-[#c4a035]/85 transition-colors hover:border-[#c4a035]/25 hover:bg-[#c4a035]/[0.04]"
                            >
                              <ChevronRight className="h-4 w-4" strokeWidth={2} />
                            </button>
                          </div>
                          <div className="grid grid-cols-7 gap-0.5 text-center">
                            {['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].map((d) => (
                              <span
                                key={d}
                                className="py-0.5 font-label-caps text-[8px] uppercase tracking-[0.12em] text-on-surface-variant"
                              >
                                {d}
                              </span>
                            ))}
                            {grid.map((date, i) => {
                              if (!date) return <span key={`e-${i}`} className="h-8" />;
                              const key = calendarDateKey(
                                date.getFullYear(),
                                date.getMonth(),
                                date.getDate(),
                              );
                              const inRange = Boolean(
                                draftFrom && draftTo && key >= draftFrom && key <= draftTo,
                              );
                              const isEdge = key === draftFrom || key === draftTo;
                              const isToday = key === todayKey;
                              const hasEvents = daysWithEvents.has(key);
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => onDayClick(date)}
                                  className={[
                                    'relative flex h-8 items-center justify-center rounded-xl text-[12px] transition-colors',
                                    inRange
                                      ? 'bg-[#c4a035]/[0.08] text-[#e8d59a]'
                                      : 'text-on-surface-variant hover:bg-[#c4a035]/[0.04] hover:text-[#e8d59a]',
                                    isEdge && 'bg-[#c4a035]/[0.14] text-[#e8d59a]',
                                    isToday && !inRange && 'ring-1 ring-[#c4a035]/25',
                                  ]
                                    .filter(Boolean)
                                    .join(' ')}
                                >
                                  {date.getDate()}
                                  {hasEvents ? (
                                    <span
                                      className={`absolute bottom-1 h-0.5 w-0.5 rounded-full ${
                                        isEdge ? 'bg-[#e8d59a]' : 'bg-[#c4a035]/85'
                                      }`}
                                    />
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex justify-end gap-1.5 pt-0.5">
                            <button
                              type="button"
                              onClick={() => setCalendarOpen(false)}
                              className={`${chip} ${chipIdle}`}
                            >
                              Zavrieť
                            </button>
                            <button
                              type="button"
                              onClick={applyDraft}
                              disabled={!draft.from}
                              className={`${chip} ${chipOn} disabled:opacity-40`}
                            >
                              Použiť
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </>
              ) : null}

              {openPanel === 'where' ? (
                <div className="space-y-3" data-area-filter="bratislava-boroughs-v1">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5" role="list" aria-label="Rozsah">
                    <button
                      type="button"
                      onClick={() => setArea('bratislava')}
                      className={`${chip} ${area === 'bratislava' ? chipOn : chipIdle}`}
                    >
                      Kdekoľvek
                    </button>
                    <button
                      type="button"
                      onClick={() => setArea('near_me')}
                      className={`${chip} ${area === 'near_me' ? chipOn : chipIdle}`}
                    >
                      Blízko mňa
                    </button>
                  </div>
                  {BOROUGHS_BY_OKRES.map((group) => (
                    <div key={group.okres} className="space-y-1.5">
                      <p className="font-label-caps text-[8px] uppercase tracking-[0.14em] text-[#c4a035]/70">
                        {group.okres}
                      </p>
                      <div
                        className="flex min-w-0 flex-wrap items-center gap-1.5"
                        role="list"
                        aria-label={group.okres}
                      >
                        {group.boroughs.map((borough) => {
                          const active = area === borough.slug;
                          return (
                            <button
                              key={borough.slug}
                              type="button"
                              onClick={() => setArea(borough.slug)}
                              className={`${chip} ${active ? chipOn : chipIdle}`}
                            >
                              {borough.borough}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {openPanel === 'sport' ? (
                <div className="space-y-2.5" data-sport-filter="flat-catalog-v1">
                  <div
                    className="flex min-w-0 flex-wrap items-center gap-1.5"
                    role="list"
                    aria-label="Športy"
                  >
                    <button
                      type="button"
                      onClick={clearSports}
                      className={`${chip} ${allSportsActive ? chipOn : chipIdle}`}
                    >
                      Všetky
                    </button>
                    {EVENT_SPORTS.map((sport) => {
                      const active = selected.has(sport);
                      return (
                        <button
                          key={sport}
                          type="button"
                          onClick={() => toggleSport(sport)}
                          className={`${chip} ${active ? chipOn : chipIdle}`}
                        >
                          {sportDisplayLabel(sport)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:gap-2">
        <div
          className={`grid min-w-0 w-full grid-cols-3 items-stretch gap-0 rounded-2xl border border-[#c4a035]/20 bg-transparent p-1 md:max-w-[min(100%,22rem)] md:flex-1 ${
            modePending ? 'opacity-70' : ''
          }`}
          role="list"
          aria-label="Publikum"
        >
          {EVENT_AUDIENCE_OPTIONS.map((option, index) => {
            const active = audience === option.key;
            return (
              <div key={option.key} className="relative min-w-0">
                {index > 0 ? (
                  <span
                    className="pointer-events-none absolute inset-y-1.5 left-0 w-px bg-[#c4a035]/20"
                    aria-hidden
                  />
                ) : null}
                <button
                  type="button"
                  role="listitem"
                  onClick={() => setAudience(option.key)}
                  className={[
                    'flex h-full w-full min-w-0 items-center justify-center rounded-xl px-1.5 py-2.5 font-label-caps text-[9px] uppercase tracking-[0.1em] transition-colors duration-200 sm:tracking-[0.12em] md:py-2',
                    active
                      ? 'bg-[#c4a035]/[0.08] text-[#e8d59a]'
                      : 'text-on-surface-variant hover:bg-[#c4a035]/[0.04] hover:text-[#e8d59a]',
                  ].join(' ')}
                >
                  <span className="truncate">{option.label}</span>
                </button>
              </div>
            );
          })}
        </div>

        <div
          className={`grid w-full min-w-0 grid-cols-2 items-stretch gap-0.5 rounded-2xl border border-[#c4a035]/20 bg-transparent p-1 transition-colors duration-200 md:w-auto md:shrink-0 ${
            modePending ? 'opacity-70' : ''
          }`}
          role="tablist"
          aria-label={t('events.modeAria')}
        >
          <button
            type="button"
            role="tab"
            aria-selected={!isSpectator}
            onClick={() => setMode('participate')}
            className={[
              'rounded-xl px-3 py-2.5 font-label-caps text-[9px] uppercase tracking-[0.12em] transition-colors duration-200 md:px-3.5 md:py-2',
              !isSpectator
                ? 'bg-[#c4a035]/[0.08] text-[#e8d59a]'
                : 'text-on-surface-variant hover:bg-[#c4a035]/[0.04] hover:text-[#e8d59a]',
            ].join(' ')}
          >
            {t('common.play')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isSpectator}
            onClick={() => setMode('spectator')}
            className={[
              'inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 font-label-caps text-[9px] uppercase tracking-[0.12em] transition-colors duration-200 md:px-3.5 md:py-2',
              isSpectator
                ? 'bg-[#c4a035]/[0.08] text-[#e8d59a]'
                : 'text-on-surface-variant hover:bg-[#c4a035]/[0.04] hover:text-[#e8d59a]',
            ].join(' ')}
          >
            <Eye className="h-3.5 w-3.5" strokeWidth={2} />
            {t('common.watch')}
          </button>
        </div>
      </div>
    </div>
  );
}
