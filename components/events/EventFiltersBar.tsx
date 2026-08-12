'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';
import type { EventType } from '@/lib/constants/events';
import type { ParticipationMode } from '@/lib/data/events';
import {
  sportDisplayLabel,
  sportPlayGroupForSport,
  SPORT_PLAY_GROUPS,
  type SportPlayGroupId,
} from '@/lib/constants/sports';
import {
  EVENT_AUDIENCE_OPTIONS,
  parseEventAudience,
  type EventAudience,
} from '@/lib/event-audience-filter';
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

interface EventFiltersBarProps {
  mode: ParticipationMode;
  typeFilter: EventType | 'ALL';
  selectedSports?: string[];
  availableSports?: string[];
  eventDayKeys?: string[];
}

type FilterPanel = 'when' | 'sport' | null;

const DATE_PRESETS: Array<{ key: Exclude<DatePreset, 'all' | 'custom'>; label: string }> = [
  { key: 'today', label: 'Dnes' },
  { key: 'tomorrow', label: 'Zajtra' },
  { key: 'weekend', label: 'Víkend' },
];

export function EventFiltersBar({
  mode,
  typeFilter: _typeFilter,
  selectedSports = [],
  availableSports,
  eventDayKeys = [],
}: EventFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [modePending, startModeTransition] = useTransition();
  const isSpectator = mode === 'spectator';
  const otherInputRef = useRef<HTMLInputElement>(null);
  const [openPanel, setOpenPanel] = useState<FilterPanel>(null);
  const [sportGroup, setSportGroup] = useState<SportPlayGroupId | null>(null);

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
  const queryFromUrl = (searchParams.get('q') ?? '').trim();
  const audience = parseEventAudience(searchParams.get('audience'));

  const availableSportSet = useMemo(
    () => new Set((availableSports ?? []).map((s) => s.toUpperCase()).filter(Boolean)),
    [availableSports],
  );

  const playGroups = useMemo(() => {
    return SPORT_PLAY_GROUPS.map((group) => {
      const sports = group.sports.filter(
        (s) =>
          availableSportSet.size === 0 ||
          availableSportSet.has(s) ||
          selected.has(s),
      );
      return { ...group, sports };
    }).filter((g) => g.sports.length > 0 || availableSportSet.size === 0);
  }, [availableSportSet, selected]);

  // Keep group open when a selected sport belongs to it.
  useEffect(() => {
    if (queryFromUrl) {
      setSportGroup('body');
      return;
    }
    if (selected.size === 0) return;
    const first = [...selected][0];
    if (!first) return;
    const group = sportPlayGroupForSport(first);
    if (group) setSportGroup(group.id);
  }, [selected, queryFromUrl]);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [otherOpen, setOtherOpen] = useState(() => queryFromUrl.length > 0);
  const [otherDraft, setOtherDraft] = useState(queryFromUrl);
  const [draft, setDraft] = useState<EventDateRange>(range);
  const [cursor, setCursor] = useState(() => {
    const anchor = parseDateKey(range.from ?? toDateKey(new Date())) ?? new Date();
    return { year: anchor.getFullYear(), month: anchor.getMonth() };
  });

  useEffect(() => {
    setOtherDraft(queryFromUrl);
    if (queryFromUrl) setOtherOpen(true);
  }, [queryFromUrl]);

  useEffect(() => {
    if (!otherOpen || openPanel !== 'sport') return;
    const id = window.setTimeout(() => otherInputRef.current?.focus(), 40);
    return () => window.clearTimeout(id);
  }, [otherOpen, openPanel]);

  const replaceParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
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

  const clearSportsAndQuery = useCallback(() => {
    replaceParams((params) => {
      params.delete('sport');
      params.delete('q');
    });
    setOtherDraft('');
    setOtherOpen(false);
    setSportGroup(null);
  }, [replaceParams]);

  const selectSportGroup = useCallback(
    (groupId: SportPlayGroupId) => {
      const group = SPORT_PLAY_GROUPS.find((g) => g.id === groupId);
      if (!group) return;
      setSportGroup(groupId);
      setOtherOpen(false);
      setOtherDraft('');
      // Soft-scope: all sports in the group until user picks one.
      const sports =
        availableSportSet.size === 0
          ? [...group.sports]
          : group.sports.filter((s) => availableSportSet.has(s));
      const next = sports.length > 0 ? sports : [...group.sports];
      replaceParams((params) => {
        params.delete('q');
        params.set('sport', next.join(','));
      });
    },
    [availableSportSet, replaceParams],
  );

  const selectPrimarySport = useCallback(
    (sport: string) => {
      const upper = sport.toUpperCase();
      replaceParams((params) => {
        params.delete('q');
        const current = new Set(
          (params.get('sport') ?? '')
            .split(',')
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean),
        );
        // Toggle off if this single sport is the only selection.
        if (current.size === 1 && current.has(upper)) {
          params.delete('sport');
        } else {
          params.set('sport', upper);
        }
      });
      setOtherDraft('');
      setOtherOpen(false);
    },
    [replaceParams],
  );

  const applyOtherQuery = useCallback(
    (raw: string) => {
      const value = raw.trim();
      replaceParams((params) => {
        params.delete('sport');
        if (!value) params.delete('q');
        else params.set('q', value);
      });
    },
    [replaceParams],
  );

  useEffect(() => {
    if (!otherOpen || openPanel !== 'sport') return;
    const handle = window.setTimeout(() => {
      const next = otherDraft.trim();
      if (next === queryFromUrl) return;
      applyOtherQuery(otherDraft);
    }, 350);
    return () => window.clearTimeout(handle);
  }, [otherDraft, otherOpen, openPanel, queryFromUrl, applyOtherQuery]);

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

  const activePlayGroup = sportGroup
    ? playGroups.find((g) => g.id === sportGroup) ?? null
    : null;

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
  const otherActive = otherOpen || queryFromUrl.length > 0;
  const allSportsActive = selected.size === 0 && !queryFromUrl;

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
  const sportSummary = queryFromUrl
    ? queryFromUrl
    : selected.size === 1
      ? sportDisplayLabel([...selected][0]!)
      : selected.size > 1
        ? sportPlayGroupForSport([...selected][0]!)?.label ?? `${selected.size} športy`
        : 'Športy';

  const chip =
    'inline-flex shrink-0 items-center rounded-xl border px-3 py-2 font-label-caps text-[9px] uppercase tracking-[0.12em] transition-colors duration-200 active:scale-[0.98] whitespace-nowrap';
  const chipIdle =
    'border-white/10 bg-transparent text-on-surface-variant hover:border-white/18 hover:bg-white/[0.03] hover:text-zinc-200';
  const chipOn = 'border-white/18 bg-white/[0.05] text-white';
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
        aria-controls={`filter-panel-${opts.id}`}
        onClick={() => togglePanel(opts.id)}
        className={[
          'group flex h-full min-w-0 w-full items-center justify-center gap-1 rounded-xl px-1.5 py-2.5 text-center transition-colors duration-200 sm:gap-1.5 sm:px-2',
          open
            ? 'bg-white/[0.05] text-white'
            : opts.filtered
              ? 'text-white hover:bg-white/[0.03]'
              : 'text-on-surface-variant hover:bg-white/[0.03] hover:text-zinc-200',
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
    <div className="flex w-full min-w-0 flex-col gap-2.5" data-event-filters-bar="v8-two-tabs">
      {/* 2 summary tabs — when + sports */}
      <div
        className="grid min-w-0 grid-cols-2 items-stretch gap-0 rounded-2xl border border-white/10 bg-transparent p-1 transition-colors duration-200"
        role="toolbar"
        aria-label="Filtre"
      >
        {archTab({ id: 'when', label: whenSummary, filtered: dateActive })}
        <div className="relative min-w-0">
          <span
            className="pointer-events-none absolute inset-y-1.5 left-0 w-px bg-white/10"
            aria-hidden
          />
          {archTab({ id: 'sport', label: sportSummary, filtered: !allSportsActive })}
        </div>
      </div>

      {/* Rollup — list-item surface */}
      <AnimatePresence initial={false} mode="wait">
        {openPanel ? (
          <motion.div
            key={openPanel}
            id={`filter-panel-${openPanel}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-white/10 bg-transparent px-3 py-3 space-y-2.5 sm:px-3.5">
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
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 text-on-surface-variant transition-colors hover:border-white/18 hover:bg-white/[0.03] hover:text-primary-container"
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
                        <div className="rounded-2xl border border-white/10 bg-transparent p-3 space-y-2">
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
                              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-primary-container/85 transition-colors hover:border-white/18 hover:bg-white/[0.03]"
                            >
                              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                            </button>
                            <p className="font-headline-md text-xs capitalize text-white">
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
                              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-primary-container/85 transition-colors hover:border-white/18 hover:bg-white/[0.03]"
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
                                      ? 'bg-white/[0.06] text-white'
                                      : 'text-on-surface-variant hover:bg-white/[0.03] hover:text-zinc-200',
                                    isEdge && 'bg-white/[0.1] text-white',
                                    isToday && !inRange && 'ring-1 ring-white/18',
                                  ]
                                    .filter(Boolean)
                                    .join(' ')}
                                >
                                  {date.getDate()}
                                  {hasEvents ? (
                                    <span
                                      className={`absolute bottom-1 h-0.5 w-0.5 rounded-full ${
                                        isEdge ? 'bg-primary-container' : 'bg-primary-container/85'
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

              {openPanel === 'sport' ? (
                <div className="space-y-2.5" data-sport-filter="play-groups-v1">
                  <AnimatePresence initial={false} mode="wait">
                    {!activePlayGroup ? (
                      <motion.div
                        key="groups"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.18 }}
                        className="space-y-2"
                      >
                        <div className={scrollRow} role="list" aria-label="Ako hráš">
                          <button
                            type="button"
                            onClick={clearSportsAndQuery}
                            className={`${chip} ${allSportsActive ? chipOn : chipIdle}`}
                          >
                            Všetky
                          </button>
                          {playGroups.map((group) => {
                            const groupSet = new Set<string>(group.sports);
                            const active =
                              !queryFromUrl &&
                              selected.size > 0 &&
                              [...selected].every((s) => groupSet.has(s));
                            return (
                              <button
                                key={group.id}
                                type="button"
                                onClick={() => selectSportGroup(group.id)}
                                className={`${chip} ${active ? chipOn : chipIdle}`}
                                title={group.hint}
                              >
                                {group.label}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => {
                              setSportGroup('body');
                              setOtherOpen(true);
                            }}
                            className={`${chip} ${otherActive && selected.size === 0 ? chipOn : chipIdle}`}
                          >
                            Other
                          </button>
                        </div>
                        <p className="px-0.5 font-body-md text-[11px] text-on-surface-variant">
                          Vyber, čím hráš — potom konkrétny šport.
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key={activePlayGroup.id}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        transition={{ duration: 0.18 }}
                        className="space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSportGroup(null);
                              clearSportsAndQuery();
                            }}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 text-on-surface-variant transition-colors hover:border-white/18 hover:bg-white/[0.03] hover:text-white"
                            aria-label="Späť na kategórie"
                          >
                            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                          </button>
                          <div className="min-w-0">
                            <p className="font-label-caps text-[9px] uppercase tracking-[0.12em] text-white">
                              {activePlayGroup.label}
                            </p>
                            <p className="font-body-md text-[11px] text-on-surface-variant">
                              {activePlayGroup.hint}
                            </p>
                          </div>
                        </div>

                        <div
                          className={scrollRow}
                          role="list"
                          aria-label={`Športy — ${activePlayGroup.label}`}
                        >
                          {(() => {
                            const relevant = activePlayGroup.sports.filter(
                              (s) => availableSportSet.size === 0 || availableSportSet.has(s),
                            );
                            const groupAllActive =
                              !queryFromUrl &&
                              relevant.length > 0 &&
                              selected.size === relevant.length &&
                              relevant.every((s) => selected.has(s));
                            return (
                              <button
                                type="button"
                                onClick={() => selectSportGroup(activePlayGroup.id)}
                                className={`${chip} ${groupAllActive ? chipOn : chipIdle}`}
                              >
                                Celá skupina
                              </button>
                            );
                          })()}
                          {activePlayGroup.sports.map((sport) => {
                            const active =
                              selected.has(sport) && selected.size === 1 && !queryFromUrl;
                            return (
                              <button
                                key={sport}
                                type="button"
                                onClick={() => selectPrimarySport(sport)}
                                className={`${chip} ${active ? chipOn : chipIdle}`}
                              >
                                {sportDisplayLabel(sport)}
                              </button>
                            );
                          })}
                          {activePlayGroup.id === 'body' ? (
                            otherOpen ? (
                              <input
                                ref={otherInputRef}
                                type="text"
                                value={otherDraft}
                                onChange={(e) => setOtherDraft(e.target.value)}
                                onBlur={() => {
                                  applyOtherQuery(otherDraft);
                                  if (!otherDraft.trim() && !queryFromUrl) setOtherOpen(false);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    applyOtherQuery(otherDraft);
                                    otherInputRef.current?.blur();
                                  }
                                  if (e.key === 'Escape') {
                                    e.preventDefault();
                                    if (!queryFromUrl) {
                                      setOtherDraft('');
                                      setOtherOpen(false);
                                    } else {
                                      setOtherDraft(queryFromUrl);
                                      setOtherOpen(false);
                                    }
                                  }
                                }}
                                placeholder="Other…"
                                aria-label="Other šport"
                                className={`${chip} ${chipOn} w-[6.5rem] max-w-[40vw] cursor-text normal-case tracking-normal outline-none placeholder:uppercase placeholder:tracking-[0.12em] sm:w-[8rem]`}
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => setOtherOpen(true)}
                                className={`${chip} ${otherActive ? chipOn : chipIdle} max-w-[10rem] truncate`}
                                title={queryFromUrl || 'Other'}
                              >
                                {queryFromUrl || 'Other'}
                              </button>
                            )
                          ) : null}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/*
        Mobile: stack — audience scrolls horizontally, mode is a full-width 50/50 control.
        md+: side-by-side without wrapping over each other.
      */}
      <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:gap-2">
        <div
          className={`grid min-w-0 w-full grid-cols-3 items-stretch gap-0 rounded-2xl border border-white/10 bg-transparent p-1 md:max-w-[min(100%,22rem)] md:flex-1 ${
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
                    className="pointer-events-none absolute inset-y-1.5 left-0 w-px bg-white/10"
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
                      ? 'bg-white/[0.05] text-white'
                      : 'text-on-surface-variant hover:bg-white/[0.03] hover:text-zinc-200',
                  ].join(' ')}
                >
                  <span className="truncate">{option.label}</span>
                </button>
              </div>
            );
          })}
        </div>

        <div
          className={`grid w-full min-w-0 grid-cols-2 items-stretch gap-0.5 rounded-2xl border border-white/10 bg-transparent p-1 transition-colors duration-200 md:w-auto md:shrink-0 ${
            modePending ? 'opacity-70' : ''
          }`}
          role="tablist"
          aria-label="Hrať alebo sledovať"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!isSpectator}
            onClick={() => setMode('participate')}
            className={[
              'rounded-xl px-3 py-2.5 font-label-caps text-[9px] uppercase tracking-[0.12em] transition-colors duration-200 md:px-3.5 md:py-2',
              !isSpectator
                ? 'bg-white/[0.05] text-white'
                : 'text-on-surface-variant hover:bg-white/[0.03] hover:text-zinc-200',
            ].join(' ')}
          >
            Hrať
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isSpectator}
            onClick={() => setMode('spectator')}
            className={[
              'inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 font-label-caps text-[9px] uppercase tracking-[0.12em] transition-colors duration-200 md:px-3.5 md:py-2',
              isSpectator
                ? 'bg-white/[0.05] text-white'
                : 'text-on-surface-variant hover:bg-white/[0.03] hover:text-zinc-200',
            ].join(' ')}
          >
            <Eye className="h-3.5 w-3.5" strokeWidth={2} />
            Sledovať
          </button>
        </div>
      </div>
    </div>
  );
}
