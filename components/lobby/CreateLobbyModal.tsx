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
  Repeat,
  Search,
  Swords,
  UserRound,
  Users,
} from 'lucide-react';
import {
  formatLobbyScheduleSummary,
  LobbySchedulePicker,
} from '@/components/lobby/LobbySchedulePicker';
import { toDateKey } from '@/lib/event-date-filter';
import type { HomeFilterVenue } from '@/lib/data/homepage';
import type { CreateLobbyDraft, SkillLevel } from '@/types/lobby';
import {
  EMPTY_CREATE_DRAFT,
  LOBBY_TYPE_LABELS,
  LobbyType,
  SKILL_LEVEL_LABELS,
} from '@/types/lobby';
import { isVenueUuid, mapSportLabelToLobbySport } from '@/lib/lobby-create';
import { toVenueHomepageUrl } from '@/lib/venues/homepage-url';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import {
  EVENT_SPORT_KEYWORDS,
  LOBBY_SPORTS,
  sportDisplayLabel,
} from '@/lib/constants/sports';

const SPORTS = LOBBY_SPORTS.map((sport) => sportDisplayLabel(sport));
const FALLBACK_VENUES: HomeFilterVenue[] = [
  { id: 'fallback-park-21', name: 'Park 21', city: 'Bratislava', sports: [] },
  { id: 'fallback-aurial', name: 'Aurial Padel', city: 'Bratislava', sports: ['PADEL'] },
  { id: 'fallback-fitcamp', name: 'FitCamp', city: 'Bratislava', sports: [] },
  { id: 'fallback-tehelne', name: 'Tehelné pole', city: 'Bratislava', sports: ['FOOTBALL'] },
  { id: 'fallback-ntc', name: 'NTC Bratislava', city: 'Bratislava', sports: [] },
];
const SPOT_OPTIONS = [1, 2, 3, 4, 5] as const;
const VENUE_SUGGESTION_LIMIT = 3;

function scoreVenueMatch(
  venue: HomeFilterVenue,
  query: string,
  selectedSport: string,
): number {
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

  const sportApi = mapSportLabelToLobbySport(selectedSport);
  const sportKeys = sportApi
    ? [sportApi, ...(EVENT_SPORT_KEYWORDS[sportApi] ?? [])]
    : [];
  if (sportKeys.length > 0) {
    const sportHit = sports.some((sport) =>
      sportKeys.some((key) => sport.includes(key.toUpperCase())),
    );
    const nameHit = sportKeys.some((key) => name.includes(key.toLowerCase()));
    if (sportHit || nameHit) score += 25;
  }

  return score;
}

type DetailPhase = 'sport' | 'schedule' | 'venue' | 'players';

interface CreateLobbyModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (draft: CreateLobbyDraft) => Promise<void> | void;
  venues?: HomeFilterVenue[];
  city?: string;
  initialSport?: string;
}

const TYPE_OPTIONS: { type: LobbyType; icon: typeof Users; desc: string }[] = [
  { type: LobbyType.SINGLE_PLAYER_1, icon: Users, desc: 'Doplň voľné miesto v zápase' },
  { type: LobbyType.TEAM_VS_TEAM, icon: Swords, desc: 'Vyzvi iný tím na zápas' },
  { type: LobbyType.RECURRING_SQUAD, icon: Repeat, desc: 'Založ pravidelnú partiu' },
];

const chip =
  'inline-flex items-center justify-center rounded-xl border px-2 py-2 text-center font-label-caps text-[8px] uppercase leading-tight tracking-[0.1em] transition-colors duration-200 active:scale-[0.98]';
const chipIdle =
  'border-white/10 bg-transparent text-on-surface-variant hover:border-white/18 hover:bg-white/[0.03] hover:text-zinc-200';
const chipOn = 'border-white/18 bg-white/[0.05] text-white';
const chipGrid = 'grid grid-cols-3 gap-1.5 sm:grid-cols-4';
const scrollRow =
  'flex min-w-0 flex-wrap items-center gap-1.5 py-0.5';
const sectionLabel = 'font-label-caps text-[9px] uppercase tracking-[0.14em] text-tertiary';

const panelMotion = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const },
};

function phaseSummary(phase: DetailPhase, draft: CreateLobbyDraft): string | null {
  switch (phase) {
    case 'sport':
      return draft.sport || null;
    case 'schedule':
      return draft.date && draft.time ? formatLobbyScheduleSummary(draft.date, draft.time) : null;
    case 'venue':
      return draft.venue || null;
    case 'players':
      return `${draft.spotsNeeded} · ${SKILL_LEVEL_LABELS[draft.skillLevel]}`;
  }
}

function phaseUnlocked(phase: DetailPhase, draft: CreateLobbyDraft): boolean {
  switch (phase) {
    case 'sport':
      return true;
    case 'schedule':
      return Boolean(draft.sport);
    case 'venue':
      return Boolean(draft.sport && draft.date && draft.time);
    case 'players':
      return Boolean(draft.sport && draft.date && draft.time && draft.venue);
  }
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

export function CreateLobbyModal({
  open,
  onClose,
  onCreated,
  venues = [],
  city = 'Bratislava',
  initialSport,
}: CreateLobbyModalProps) {
  const titleId = useId();
  const venueSearchId = useId();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [detailPhase, setDetailPhase] = useState<DetailPhase | null>(null);
  const [draft, setDraft] = useState<CreateLobbyDraft>(EMPTY_CREATE_DRAFT);
  const [venueQuery, setVenueQuery] = useState('');
  const [venueHighlight, setVenueHighlight] = useState(0);
  const [fetchedVenues, setFetchedVenues] = useState<HomeFilterVenue[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useBodyScrollLock(open);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setDetailPhase(null);
    setVenueQuery('');
    setVenueHighlight(0);
    setSubmitting(false);
    setSubmitError(null);
    setDraft({
      ...EMPTY_CREATE_DRAFT,
      date: toDateKey(new Date()),
      sport: initialSport ?? '',
      venue: '',
      venueId: null,
      websiteUrl: null,
    });
  }, [open, initialSport]);

  useEffect(() => {
    if (!open || venues.length > 0) return;
    let cancelled = false;
    fetch('/api/venues?radius=50')
      .then((res) => res.json())
      .then((payload: { venues?: Array<{ id: string; name: string; city: string; sports?: string[] | null; website_url?: string | null; websiteUrl?: string | null }> }) => {
        if (cancelled || !Array.isArray(payload.venues)) return;
        setFetchedVenues(
          payload.venues.map((v) => ({
            id: v.id,
            name: v.name,
            city: v.city,
            sports: v.sports ?? [],
            websiteUrl: toVenueHomepageUrl(v.websiteUrl ?? v.website_url),
          })),
        );
      })
      .catch(() => {
        /* keep fallback list */
      });
    return () => {
      cancelled = true;
    };
  }, [open, venues.length]);

  const catalogVenues = useMemo(() => {
    if (venues.length > 0) return venues;
    if (fetchedVenues.length > 0) return fetchedVenues;
    return FALLBACK_VENUES;
  }, [venues, fetchedVenues]);

  const venueQueryTrim = venueQuery.trim();
  const venueQueryLower = venueQueryTrim.toLowerCase();

  const suggestedVenues = useMemo(() => {
    // Wait for a real token so short noise ("t") doesn't dump a long list.
    if (venueQueryLower.length < 2) return [];

    return catalogVenues
      .map((venue) => ({
        venue,
        score: scoreVenueMatch(venue, venueQueryLower, draft.sport),
      }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || a.venue.name.localeCompare(b.venue.name))
      .slice(0, VENUE_SUGGESTION_LIMIT)
      .map((row) => row.venue);
  }, [catalogVenues, venueQueryLower, draft.sport]);

  const showSuggestions = venueQueryLower.length >= 2;

  useEffect(() => {
    setVenueHighlight(0);
  }, [venueQueryLower, detailPhase]);

  function selectVenue(name: string, venueId: string | null = null) {
    const trimmed = name.trim();
    if (!trimmed) return;

    let resolvedId = venueId && isVenueUuid(venueId) ? venueId : null;
    let websiteUrl: string | null = null;

    if (resolvedId) {
      const picked = catalogVenues.find((v) => v.id === resolvedId);
      websiteUrl = toVenueHomepageUrl(picked?.websiteUrl);
    } else {
      const matches = catalogVenues.filter(
        (v) => isVenueUuid(v.id) && v.name.toLowerCase() === trimmed.toLowerCase(),
      );
      if (matches.length === 1) {
        resolvedId = matches[0]!.id;
        websiteUrl = toVenueHomepageUrl(matches[0]!.websiteUrl);
      }
    }

    patch({ venue: trimmed, venueId: resolvedId, websiteUrl });
    setVenueQuery('');
    setVenueHighlight(0);
    setDetailPhase(null);
  }

  useEffect(() => {
    if (step === 1) setDetailPhase(null);
  }, [step]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  function patch(partial: Partial<CreateLobbyDraft>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  function canNext() {
    if (step === 0) return draft.type != null;
    if (step === 1) return Boolean(draft.sport && draft.date && draft.time && draft.venue);
    return true;
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button type="button" aria-label="Zavrieť" className="absolute inset-0" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ y: 16, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="glass-panel relative z-[101] flex max-h-[min(88dvh,620px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative shrink-0 border-b border-white/5 px-5 pb-3 pt-5 text-center">
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-3 text-on-surface-variant transition-colors hover:text-primary"
                aria-label="Zavrieť"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
              <p className="font-label-caps text-[10px] uppercase tracking-[0.18em] text-primary-container">
                Lobby
              </p>
              <h2 id={titleId} className="mt-0.5 font-headline-md text-[20px] text-on-surface">
                Vytvorenie lobby
              </h2>
              <p className="mt-1 font-label-caps text-[9px] uppercase tracking-[0.12em] text-zinc-500">
                Krok {step + 1} / 3
              </p>
              <div className="mx-auto mt-3 flex max-w-[12rem] gap-1">
                {[0, 1, 2].map((i) => (
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
                <div className="space-y-2">
                  {TYPE_OPTIONS.map(({ type, icon: Icon, desc }) => {
                    const active = draft.type === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => patch({ type })}
                        className={[
                          'flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3.5 text-left transition-colors duration-200',
                          active
                            ? 'border-primary-container/30 bg-primary-container/8'
                            : 'border-white/10 bg-transparent hover:border-white/16 hover:bg-white/[0.02]',
                        ].join(' ')}
                      >
                        <div
                          className={[
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                            active
                              ? 'border-primary-container/25 bg-primary-container/10 text-primary-container'
                              : 'border-white/10 bg-transparent text-zinc-500',
                          ].join(' ')}
                        >
                          <Icon className="h-4 w-4" strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-body-sm text-sm text-white">{LOBBY_TYPE_LABELS[type]}</p>
                          <p className="mt-0.5 font-body-sm text-xs text-zinc-500">{desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {step === 1 ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Postup vyplnenia">
                    <StepChip
                      icon={Activity}
                      label={phaseSummary('sport', draft)}
                      active={detailPhase === 'sport'}
                      done={Boolean(draft.sport)}
                      onClick={() =>
                        setDetailPhase((phase) => (phase === 'sport' ? null : 'sport'))
                      }
                    />
                    {draft.sport ? (
                      <StepChip
                        icon={CalendarDays}
                        label={phaseSummary('schedule', draft)}
                        active={detailPhase === 'schedule'}
                        done={Boolean(draft.date && draft.time)}
                        onClick={() => {
                          if (detailPhase === 'schedule' && draft.date && draft.time) {
                            setDetailPhase(null);
                            return;
                          }
                          setDetailPhase((phase) => (phase === 'schedule' ? null : 'schedule'));
                        }}
                      />
                    ) : null}
                    {draft.sport && draft.date && draft.time ? (
                      <StepChip
                        icon={Home}
                        label={phaseSummary('venue', draft)}
                        active={detailPhase === 'venue'}
                        done={Boolean(draft.venue)}
                        onClick={() =>
                          setDetailPhase((phase) => (phase === 'venue' ? null : 'venue'))
                        }
                      />
                    ) : null}
                    {draft.venue ? (
                      <StepChip
                        icon={UserRound}
                        label={phaseSummary('players', draft)}
                        active={detailPhase === 'players'}
                        done={detailPhase !== 'players' && phaseUnlocked('players', draft)}
                        onClick={() =>
                          setDetailPhase((phase) => (phase === 'players' ? null : 'players'))
                        }
                      />
                    ) : null}
                  </div>

                  {!detailPhase && !draft.sport ? (
                    <p className="font-body-sm text-xs text-zinc-500">Klikni na ikonu a vyber šport.</p>
                  ) : null}

                  <AnimatePresence mode="wait">
                    {detailPhase === 'sport' ? (
                      <motion.div key="sport" {...panelMotion}>
                        <p className={`${sectionLabel} mb-2`}>Vyber šport</p>
                        <div className={chipGrid} role="list">
                          {SPORTS.map((sport) => {
                            const active = draft.sport === sport;
                            return (
                              <button
                                key={sport}
                                type="button"
                                role="listitem"
                                onClick={() => {
                                  patch({ sport });
                                  setDetailPhase(null);
                                }}
                                className={`${chip} ${active ? chipOn : chipIdle}`}
                              >
                                <span className="line-clamp-2">{sport}</span>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    ) : null}

                    {detailPhase === 'schedule' ? (
                      <motion.div key="schedule" {...panelMotion}>
                        <p className={`${sectionLabel} mb-2`}>Kedy hráte?</p>
                        <LobbySchedulePicker
                          date={draft.date}
                          time={draft.time}
                          onDateChange={(date) => patch({ date })}
                          onTimeChange={(time) => {
                            patch({ time });
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
                              aria-expanded={showSuggestions && suggestedVenues.length > 0}
                              aria-controls={`${venueSearchId}-list`}
                              aria-autocomplete="list"
                              value={venueQuery}
                              autoFocus
                              autoComplete="off"
                              placeholder={`Napíš názov športoviska v ${city}…`}
                              onChange={(e) => setVenueQuery(e.target.value)}
                              onKeyDown={(e) => {
                                if (!showSuggestions || suggestedVenues.length === 0) {
                                  if (e.key === 'Enter' && venueQueryTrim) {
                                    e.preventDefault();
                                    selectVenue(venueQueryTrim, null);
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
                                  selectVenue(highlighted.name, highlighted.id);
                                  return;
                                }
                                if (venueQueryTrim) selectVenue(venueQueryTrim, null);
                              }}
                              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-[#FF5722]/45 focus:bg-white/[0.04]"
                            />
                          </label>

                          {showSuggestions && suggestedVenues.length > 0 ? (
                            <div
                              id={`${venueSearchId}-list`}
                              role="listbox"
                              aria-label="Najbližšie športoviská"
                              className="flex flex-col gap-1"
                            >
                              {suggestedVenues.map((venue, index) => {
                                const active = index === venueHighlight;
                                const inCatalog = isVenueUuid(venue.id);
                                return (
                                  <button
                                    key={venue.id}
                                    type="button"
                                    role="option"
                                    aria-selected={active}
                                    onMouseEnter={() => setVenueHighlight(index)}
                                    onClick={() => selectVenue(venue.name, venue.id)}
                                    className={[
                                      'w-full rounded-lg px-3 py-2 text-left transition-colors',
                                      active
                                        ? 'bg-white/[0.07] text-white'
                                        : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200',
                                    ].join(' ')}
                                  >
                                    <span className="block truncate text-sm">{venue.name}</span>
                                    {inCatalog ? (
                                      <span className="mt-0.5 block truncate text-[10px] text-zinc-500">
                        {venue.websiteUrl
                          ? 'V databáze · oficiálny web športoviska'
                          : 'V databáze SportSync'}
                                      </span>
                                    ) : null}
                                  </button>
                                );
                              })}
                            </div>
                          ) : showSuggestions ? (
                            <button
                              type="button"
                              onClick={() => selectVenue(venueQueryTrim, null)}
                              className="w-full truncate rounded-lg px-3 py-2 text-left text-sm text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-zinc-300"
                            >
                              Použiť „{venueQueryTrim}“
                            </button>
                          ) : (
                            <p className="px-1 text-[11px] text-zinc-600">
                              Začni písať — ukážeme 3 najbližšie tipy.
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ) : null}

                    {detailPhase === 'players' ? (
                      <motion.div key="players" className="space-y-4" {...panelMotion}>
                        <div>
                          <p className={`${sectionLabel} mb-2`}>Koľko hráčov hľadáš?</p>
                          <div className={scrollRow} role="list">
                            {SPOT_OPTIONS.map((n) => {
                              const active = draft.spotsNeeded === n;
                              return (
                                <button
                                  key={n}
                                  type="button"
                                  role="listitem"
                                  onClick={() => patch({ spotsNeeded: n })}
                                  className={`${chip} min-w-[2.5rem] justify-center ${active ? chipOn : chipIdle}`}
                                >
                                  {n}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <p className={`${sectionLabel} mb-2`}>Úroveň</p>
                          <div className={scrollRow} role="list">
                            {(Object.keys(SKILL_LEVEL_LABELS) as SkillLevel[]).map((level) => {
                              const active = draft.skillLevel === level;
                              return (
                                <button
                                  key={level}
                                  type="button"
                                  role="listitem"
                                  onClick={() => patch({ skillLevel: level })}
                                  className={`${chip} ${active ? chipOn : chipIdle}`}
                                >
                                  {SKILL_LEVEL_LABELS[level]}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-white/10 bg-transparent px-4 py-4 space-y-2.5">
                    <SummaryRow label="Typ" value={draft.type ? LOBBY_TYPE_LABELS[draft.type] : '—'} />
                    <SummaryRow label="Šport" value={draft.sport || '—'} />
                    <SummaryRow
                      label="Kedy"
                      value={formatLobbyScheduleSummary(draft.date, draft.time)}
                    />
                    <SummaryRow label="Kde" value={draft.venue || '—'} />
                    {draft.venueId ? (
                      <SummaryRow
                        label="Rezervácia"
                        value={
                          draft.websiteUrl
                            ? 'Link na web športoviska pôjde do lobby'
                            : 'Športovisko v databáze · link doplníme, ak ho máme'
                        }
                      />
                    ) : null}
                    <SummaryRow
                      label="Miesta"
                      value={`${draft.spotsNeeded} · ${SKILL_LEVEL_LABELS[draft.skillLevel]}`}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 gap-2 border-t border-white/5 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-outline/30 py-3 font-label-caps text-[11px] text-on-surface-variant transition-colors hover:text-on-surface"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Späť
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-outline/30 py-3 font-label-caps text-[11px] text-on-surface-variant transition-colors hover:text-on-surface"
                >
                  Zrušiť
                </button>
              )}
              {step < 2 ? (
                <button
                  type="button"
                  disabled={!canNext()}
                  onClick={() => setStep((s) => s + 1)}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-primary-container/35 bg-primary-container/10 py-3 font-label-caps text-[11px] text-white transition-all hover:border-primary-container/50 hover:bg-primary-container/15 active:scale-[0.98] disabled:opacity-40"
                >
                  Ďalej
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <div className="flex flex-1 flex-col gap-1.5">
                  {submitError ? (
                    <p className="text-center text-[11px] text-error">{submitError}</p>
                  ) : null}
                  <button
                    type="button"
                    disabled={!draft.type || submitting}
                    onClick={() => {
                      if (!draft.type || submitting) return;
                      void (async () => {
                        setSubmitError(null);
                        setSubmitting(true);
                        try {
                          await onCreated(draft);
                          onClose();
                        } catch (err) {
                          setSubmitError(
                            err instanceof Error ? err.message : 'Lobby sa nepodarilo vytvoriť.',
                          );
                        } finally {
                          setSubmitting(false);
                        }
                      })();
                    }}
                    className="w-full rounded-xl border border-primary-container/35 bg-primary-container/15 py-3 font-label-caps text-[11px] text-white transition-all hover:border-primary-container/50 hover:bg-primary-container/20 active:scale-[0.98] disabled:opacity-40"
                  >
                    {submitting ? 'Vytváram…' : 'Vytvoriť'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
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
