'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Home,
  Search,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  formatLobbyScheduleSummary,
  LobbySchedulePicker,
} from '@/components/lobby/LobbySchedulePicker';
import { toDateKey } from '@/lib/event-date-filter';
import {
  EVENT_SPORT_KEYWORDS,
  LOBBY_SPORTS,
  sportDisplayLabel,
  type LobbySport,
} from '@/lib/constants/sports';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import type { HomeFilterVenue } from '@/lib/data/homepage';

type DetailPhase = 'sport' | 'schedule' | 'venue';

const FALLBACK_VENUES: HomeFilterVenue[] = [
  { id: 'fallback-park-21', name: 'Park 21', city: 'Bratislava', sports: [] },
  { id: 'fallback-aurial', name: 'Aurial Padel', city: 'Bratislava', sports: ['PADEL'] },
  { id: 'fallback-fitcamp', name: 'FitCamp', city: 'Bratislava', sports: [] },
  { id: 'fallback-tehelne', name: 'Tehelné pole', city: 'Bratislava', sports: ['FOOTBALL'] },
  { id: 'fallback-ntc', name: 'NTC Bratislava', city: 'Bratislava', sports: [] },
];

const VENUE_SUGGESTION_LIMIT = 3;

const panelMotion = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const },
};

const sectionLabel = 'font-label-caps text-[9px] uppercase tracking-[0.14em] text-tertiary';

function sportSearchScore(sport: LobbySport, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const label = sportDisplayLabel(sport).toLowerCase();
  const keywords = (EVENT_SPORT_KEYWORDS[sport] ?? []).map((k) => k.toLowerCase());
  if (label === q || keywords.includes(q)) return 100;
  if (label.startsWith(q)) return 80;
  if (keywords.some((k) => k.startsWith(q))) return 70;
  if (label.includes(q)) return 50;
  if (keywords.some((k) => k.includes(q))) return 40;
  return 0;
}

function rankLobbySports(query: string, preferSport?: string): LobbySport[] {
  const preferred = preferSport?.toUpperCase();
  return [...LOBBY_SPORTS]
    .map((sport) => ({
      sport,
      score:
        sportSearchScore(sport, query) +
        (preferred && sport === preferred && query.trim().length > 0 ? 5 : 0),
    }))
    .filter((row) => row.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        sportDisplayLabel(a.sport).localeCompare(sportDisplayLabel(b.sport)),
    )
    .map((row) => row.sport);
}

function scoreVenueMatch(venue: HomeFilterVenue, query: string, selectedSport: string): number {
  const name = venue.name.toLowerCase();
  const city = venue.city.toLowerCase();
  const sports = venue.sports.map((s) => s.toUpperCase());
  let score = 0;

  if (name === query) score = 120;
  else if (name.startsWith(query)) score = 95;
  else if (name.split(/[\s\-_/]+/).some((part) => part.startsWith(query))) score = 85;
  else if (name.includes(query)) score = 65;
  else if (city.startsWith(query)) score = 30;
  else if (city.includes(query)) score = 15;
  else return 0;

  if (selectedSport && sports.includes(selectedSport.toUpperCase())) score += 25;
  return score;
}

function StepChip({
  icon: Icon,
  label,
  active,
  done,
  disabled,
  onClick,
}: {
  icon: typeof Activity;
  label: string | null;
  active: boolean;
  done: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 transition-all duration-200 active:scale-[0.98]',
        active
          ? 'border-primary-container/35 bg-primary-container/10 text-white'
          : done
            ? 'border-white/12 bg-white/[0.03] text-zinc-300'
            : 'border-white/8 text-zinc-500 hover:border-white/14 hover:text-zinc-400',
        disabled ? 'cursor-not-allowed opacity-35' : '',
      ].join(' ')}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
      {done && label ? (
        <span className="truncate font-label-caps text-[8px] uppercase tracking-[0.08em]">{label}</span>
      ) : null}
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="font-label-caps text-[9px] uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </span>
      <span className="truncate text-right font-body-sm text-sm text-zinc-200">{value}</span>
    </div>
  );
}

interface PlanActivityFormProps {
  groupId: string;
  defaultSport: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  triggerLabel?: string;
}

export function PlanActivityForm({
  groupId,
  defaultSport,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
  triggerLabel = 'PLAN ACTIVITY',
}: PlanActivityFormProps) {
  const router = useRouter();
  const titleId = useId();
  const sportSearchId = useId();
  const venueSearchId = useId();
  const [mounted, setMounted] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  function setOpen(next: boolean) {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  }

  const [step, setStep] = useState(0);
  const [detailPhase, setDetailPhase] = useState<DetailPhase | null>(null);
  const [sport, setSport] = useState<LobbySport | null>(null);
  const [sportQuery, setSportQuery] = useState('');
  const [sportHighlight, setSportHighlight] = useState(0);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [venueQuery, setVenueQuery] = useState('');
  const [venueHighlight, setVenueHighlight] = useState(0);
  const [fetchedVenues, setFetchedVenues] = useState<HomeFilterVenue[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useBodyScrollLock(open);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setDetailPhase('sport');
    setSport(null);
    setSportQuery('');
    setSportHighlight(0);
    setDate(toDateKey(new Date()));
    setTime('');
    setVenue('');
    setVenueQuery('');
    setVenueHighlight(0);
    setSubmitting(false);
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch('/api/venues?radius=50')
      .then((res) => res.json())
      .then(
        (payload: {
          venues?: Array<{ id: string; name: string; city: string; sports?: string[] | null }>;
        }) => {
          if (cancelled || !Array.isArray(payload.venues)) return;
          setFetchedVenues(
            payload.venues.map((v) => ({
              id: v.id,
              name: v.name,
              city: v.city,
              sports: v.sports ?? [],
            })),
          );
        },
      )
      .catch(() => {
        /* keep fallback */
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (step === 1) setDetailPhase(null);
  }, [step]);

  useEffect(() => {
    setSportHighlight(0);
  }, [sportQuery]);

  useEffect(() => {
    setVenueHighlight(0);
  }, [venueQuery, detailPhase]);

  const sportSuggestions = useMemo(() => {
    if (!sportQuery.trim()) return [];
    return rankLobbySports(sportQuery, defaultSport);
  }, [sportQuery, defaultSport]);

  const showSportSuggestions = detailPhase === 'sport' && sportQuery.trim().length > 0;

  const catalogVenues = useMemo(
    () => (fetchedVenues.length > 0 ? fetchedVenues : FALLBACK_VENUES),
    [fetchedVenues],
  );

  const venueQueryTrim = venueQuery.trim();
  const venueQueryLower = venueQueryTrim.toLowerCase();
  const suggestedVenues = useMemo(() => {
    if (venueQueryLower.length < 2) return [];
    return catalogVenues
      .map((row) => ({
        venue: row,
        score: scoreVenueMatch(row, venueQueryLower, sport ?? ''),
      }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || a.venue.name.localeCompare(b.venue.name))
      .slice(0, VENUE_SUGGESTION_LIMIT)
      .map((row) => row.venue);
  }, [catalogVenues, venueQueryLower, sport]);

  const showVenueSuggestions = venueQueryLower.length >= 2;

  function closeModal() {
    setOpen(false);
  }

  function selectSport(next: LobbySport) {
    setSport(next);
    setSportQuery('');
    setDetailPhase(null);
  }

  function selectVenue(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setVenue(trimmed);
    setVenueQuery('');
    setDetailPhase(null);
  }

  function canNext() {
    return Boolean(sport && date && time);
  }

  async function handleCreate() {
    if (!sport || !date || !time || submitting) return;
    setError(null);

    const scheduledAt = new Date(`${date}T${time}`);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      setError('Vyber budúci dátum a čas.');
      return;
    }

    setSubmitting(true);
    const sportLabel = sportDisplayLabel(sport);

    const res = await fetch(`/api/groups/${groupId}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: sportLabel,
        sport,
        scheduledAt: scheduledAt.toISOString(),
        locationNote: venue.trim() || undefined,
      }),
    });

    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      setSubmitting(false);
      setError(body?.error ?? 'Session sa nepodarilo vytvoriť.');
      return;
    }

    closeModal();
    router.refresh();
  }

  const modal = open ? (
    <motion.div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button type="button" aria-label="Zavrieť" className="absolute inset-0" onClick={closeModal} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ y: 16, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 16, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="glass-panel relative z-[131] flex max-h-[min(88dvh,620px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative shrink-0 border-b border-white/5 px-5 pb-3 pt-5 text-center">
          <button
            type="button"
            onClick={closeModal}
            className="absolute right-3 top-3 text-on-surface-variant transition-colors hover:text-primary"
            aria-label="Zavrieť"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
          <p className="font-label-caps text-[10px] uppercase tracking-[0.18em] text-primary-container">
            Crew
          </p>
          <h2 id={titleId} className="mt-0.5 font-headline-md text-[20px] text-on-surface">
            Nová session
          </h2>
          <p className="mt-1 font-label-caps text-[9px] uppercase tracking-[0.12em] text-zinc-500">
            Krok {step + 1} / 2
          </p>
          <div className="mx-auto mt-3 flex max-w-[8rem] gap-1">
            {[0, 1].map((i) => (
              <div
                key={i}
                className={`h-0.5 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-primary-container/80' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {step === 0 ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Postup vyplnenia">
                <StepChip
                  icon={Activity}
                  label={sport ? sportDisplayLabel(sport) : null}
                  active={detailPhase === 'sport'}
                  done={Boolean(sport)}
                  onClick={() => setDetailPhase((phase) => (phase === 'sport' ? null : 'sport'))}
                />
                {sport ? (
                  <StepChip
                    icon={CalendarDays}
                    label={date && time ? formatLobbyScheduleSummary(date, time) : null}
                    active={detailPhase === 'schedule'}
                    done={Boolean(date && time)}
                    onClick={() => {
                      if (detailPhase === 'schedule' && date && time) {
                        setDetailPhase(null);
                        return;
                      }
                      setDetailPhase((phase) => (phase === 'schedule' ? null : 'schedule'));
                    }}
                  />
                ) : null}
                {sport && date && time ? (
                  <StepChip
                    icon={Home}
                    label={venue || null}
                    active={detailPhase === 'venue'}
                    done={Boolean(venue)}
                    onClick={() => setDetailPhase((phase) => (phase === 'venue' ? null : 'venue'))}
                  />
                ) : null}
              </div>

              {!detailPhase && !sport ? (
                <p className="font-body-sm text-xs text-zinc-500">Klikni na ikonu a vyber šport.</p>
              ) : null}

              <AnimatePresence mode="wait">
                {detailPhase === 'sport' ? (
                  <motion.div key="sport" className="space-y-3" {...panelMotion}>
                    <p className={sectionLabel}>Vyber šport</p>
                    <label htmlFor={sportSearchId} className="relative block">
                      <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                        strokeWidth={1.75}
                      />
                      <input
                        id={sportSearchId}
                        type="search"
                        autoComplete="off"
                        autoFocus
                        role="combobox"
                        aria-expanded={showSportSuggestions}
                        aria-controls={`${sportSearchId}-list`}
                        aria-autocomplete="list"
                        value={sportQuery}
                        placeholder="Vyber šport"
                        onChange={(e) => setSportQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (!sportQuery.trim()) return;
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setSportHighlight((i) =>
                              Math.min(i + 1, Math.max(sportSuggestions.length - 1, 0)),
                            );
                            return;
                          }
                          if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setSportHighlight((i) => Math.max(i - 1, 0));
                            return;
                          }
                          if (e.key === 'Enter' && sportSuggestions[sportHighlight]) {
                            e.preventDefault();
                            selectSport(sportSuggestions[sportHighlight]);
                          }
                        }}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-[#FF5722]/45 focus:bg-white/[0.04]"
                      />
                    </label>

                    {showSportSuggestions ? (
                      <div
                        id={`${sportSearchId}-list`}
                        role="listbox"
                        aria-label="Športy"
                        className="flex flex-col gap-1"
                      >
                        {sportSuggestions.length > 0 ? (
                          sportSuggestions.map((option, index) => {
                            const active = index === sportHighlight;
                            return (
                              <button
                                key={option}
                                type="button"
                                role="option"
                                aria-selected={active}
                                onMouseEnter={() => setSportHighlight(index)}
                                onClick={() => selectSport(option)}
                                className={[
                                  'w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors',
                                  active
                                    ? 'bg-white/[0.07] text-white'
                                    : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200',
                                ].join(' ')}
                              >
                                {sportDisplayLabel(option)}
                              </button>
                            );
                          })
                        ) : (
                          <p className="px-1 text-[11px] text-zinc-600">
                            Nič nenašiel pre „{sportQuery.trim()}“
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="px-1 text-[11px] text-zinc-600">
                        Začni písať — ukážeme najbližšie tipy.
                      </p>
                    )}
                  </motion.div>
                ) : null}

                {detailPhase === 'schedule' ? (
                  <motion.div key="schedule" {...panelMotion}>
                    <p className={`${sectionLabel} mb-2`}>Kedy hráte?</p>
                    <LobbySchedulePicker
                      date={date}
                      time={time}
                      onDateChange={setDate}
                      onTimeChange={(next) => {
                        setTime(next);
                        setDetailPhase(null);
                      }}
                    />
                  </motion.div>
                ) : null}

                {detailPhase === 'venue' ? (
                  <motion.div key="venue" className="space-y-3" {...panelMotion}>
                    <p className={sectionLabel}>Kde sa stretnete?</p>
                    <div className="space-y-2">
                      <label htmlFor={venueSearchId} className="relative block">
                        <Search
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                          strokeWidth={1.75}
                        />
                        <input
                          id={venueSearchId}
                          type="search"
                          role="combobox"
                          aria-expanded={showVenueSuggestions && suggestedVenues.length > 0}
                          aria-controls={`${venueSearchId}-list`}
                          aria-autocomplete="list"
                          value={venueQuery}
                          autoFocus
                          autoComplete="off"
                          placeholder="Napíš názov športoviska…"
                          onChange={(e) => setVenueQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (!showVenueSuggestions || suggestedVenues.length === 0) {
                              if (e.key === 'Enter' && venueQueryTrim) {
                                e.preventDefault();
                                selectVenue(venueQueryTrim);
                              }
                              return;
                            }
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setVenueHighlight((i) =>
                                Math.min(i + 1, suggestedVenues.length - 1),
                              );
                              return;
                            }
                            if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setVenueHighlight((i) => Math.max(i - 1, 0));
                              return;
                            }
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              setVenueQuery('');
                              return;
                            }
                            if (e.key !== 'Enter') return;
                            e.preventDefault();
                            const highlighted = suggestedVenues[venueHighlight];
                            if (highlighted) {
                              selectVenue(highlighted.name);
                              return;
                            }
                            if (venueQueryTrim) selectVenue(venueQueryTrim);
                          }}
                          className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-[#FF5722]/45 focus:bg-white/[0.04]"
                        />
                      </label>

                      {showVenueSuggestions && suggestedVenues.length > 0 ? (
                        <div
                          id={`${venueSearchId}-list`}
                          role="listbox"
                          aria-label="Najbližšie športoviská"
                          className="flex flex-col gap-1"
                        >
                          {suggestedVenues.map((row, index) => {
                            const active = index === venueHighlight;
                            return (
                              <button
                                key={row.id}
                                type="button"
                                role="option"
                                aria-selected={active}
                                onMouseEnter={() => setVenueHighlight(index)}
                                onClick={() => selectVenue(row.name)}
                                className={[
                                  'w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors',
                                  active
                                    ? 'bg-white/[0.07] text-white'
                                    : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200',
                                ].join(' ')}
                              >
                                {row.name}
                              </button>
                            );
                          })}
                        </div>
                      ) : showVenueSuggestions ? (
                        <button
                          type="button"
                          onClick={() => selectVenue(venueQueryTrim)}
                          className="w-full truncate rounded-lg px-3 py-2 text-left text-sm text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-zinc-300"
                        >
                          Použiť „{venueQueryTrim}“
                        </button>
                      ) : (
                        <p className="px-1 text-[11px] text-zinc-600">
                          Začni písať — ukážeme 3 najbližšie tipy. Miesto je voliteľné.
                        </p>
                      )}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-5">
              <div className="space-y-2.5 rounded-2xl border border-white/10 bg-transparent px-4 py-4">
                <SummaryRow label="Šport" value={sport ? sportDisplayLabel(sport) : '—'} />
                <SummaryRow label="Kedy" value={formatLobbyScheduleSummary(date, time)} />
                <SummaryRow label="Kde" value={venue || 'TBA'} />
              </div>
              {error ? <p className="text-center text-[11px] text-error">{error}</p> : null}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-white/5 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep(0)}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-outline/30 py-3 font-label-caps text-[11px] text-on-surface-variant transition-colors hover:text-on-surface"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Späť
            </button>
          ) : (
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 rounded-xl border border-outline/30 py-3 font-label-caps text-[11px] text-on-surface-variant transition-colors hover:text-on-surface"
            >
              Zrušiť
            </button>
          )}
          {step < 1 ? (
            <button
              type="button"
              disabled={!canNext()}
              onClick={() => setStep(1)}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-primary-container/35 bg-primary-container/10 py-3 font-label-caps text-[11px] text-white transition-all hover:border-primary-container/50 hover:bg-primary-container/15 active:scale-[0.98] disabled:opacity-40"
            >
              Ďalej
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={!sport || submitting}
              onClick={() => void handleCreate()}
              className="flex-1 rounded-xl border border-primary-container/35 bg-primary-container/15 py-3 font-label-caps text-[11px] text-white transition-all hover:border-primary-container/50 hover:bg-primary-container/20 active:scale-[0.98] disabled:opacity-40"
            >
              {submitting ? 'Vytváram…' : 'Vytvoriť'}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  ) : null;

  if (!mounted) {
    return !hideTrigger ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glow-hover flex w-full items-center justify-center gap-2 rounded-lg bg-primary-container py-4 font-label-caps text-label-caps text-white transition-all active:scale-95"
      >
        <span className="material-symbols-outlined text-[18px]">event_available</span>
        {triggerLabel}
      </button>
    ) : null;
  }

  return (
    <>
      {!hideTrigger ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="glow-hover flex w-full items-center justify-center gap-2 rounded-lg bg-primary-container py-4 font-label-caps text-label-caps text-white transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">event_available</span>
          {triggerLabel}
        </button>
      ) : null}

      {createPortal(
        <AnimatePresence>{modal}</AnimatePresence>,
        document.body,
      )}
    </>
  );
}
