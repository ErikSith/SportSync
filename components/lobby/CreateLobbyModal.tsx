'use client';

import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Home,
  Repeat,
  Sparkles,
  Swords,
  UserRound,
  Users,
} from 'lucide-react';
import {
  formatLobbyScheduleSummary,
  LobbySchedulePicker,
} from '@/components/lobby/LobbySchedulePicker';
import { toDateKey } from '@/lib/event-date-filter';
import type { CreateLobbyDraft, SkillLevel } from '@/types/lobby';
import {
  EMPTY_CREATE_DRAFT,
  LOBBY_TYPE_LABELS,
  LobbyType,
  SKILL_LEVEL_LABELS,
} from '@/types/lobby';
import { parseAiLobbyPrompt } from '@/components/lobby/lobby-ui';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

const SPORTS = ['Padel', 'Tenis', 'Futbal', 'Basketbal', 'Squash', 'Running', 'Volleyball', 'Hockey'];
const VENUES = ['Park 21', 'Aurial Padel', 'FitCamp', 'Tehelné pole', 'NTC Bratislava'];
const SPOT_OPTIONS = [1, 2, 3, 4, 5] as const;

type DetailPhase = 'sport' | 'schedule' | 'venue' | 'players';

interface CreateLobbyModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (draft: CreateLobbyDraft) => void;
}

const TYPE_OPTIONS: { type: LobbyType; icon: typeof Users; desc: string }[] = [
  { type: LobbyType.SINGLE_PLAYER_1, icon: Users, desc: 'Doplň voľné miesto v zápase' },
  { type: LobbyType.TEAM_VS_TEAM, icon: Swords, desc: 'Vyzvi iný tím na zápas' },
  { type: LobbyType.RECURRING_SQUAD, icon: Repeat, desc: 'Založ pravidelnú partiu' },
];

const chip =
  'inline-flex shrink-0 items-center rounded-xl border px-3 py-2 font-label-caps text-[9px] uppercase tracking-[0.12em] transition-colors duration-200 active:scale-[0.98] whitespace-nowrap';
const chipIdle =
  'border-white/10 bg-transparent text-on-surface-variant hover:border-white/18 hover:bg-white/[0.03] hover:text-zinc-200';
const chipOn = 'border-white/18 bg-white/[0.05] text-white';
const scrollRow =
  'flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain hide-scrollbar touch-pan-x py-0.5';
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

export function CreateLobbyModal({ open, onClose, onCreated }: CreateLobbyModalProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [detailPhase, setDetailPhase] = useState<DetailPhase | null>(null);
  const [draft, setDraft] = useState<CreateLobbyDraft>(EMPTY_CREATE_DRAFT);
  const [aiParsing, setAiParsing] = useState(false);
  const [aiHint, setAiHint] = useState<string | null>(null);

  useBodyScrollLock(open);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setDetailPhase(null);
    setDraft({
      ...EMPTY_CREATE_DRAFT,
      date: toDateKey(new Date()),
      sport: '',
      venue: '',
    });
    setAiHint(null);
  }, [open]);

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

  function runAiFill() {
    if (!draft.aiPrompt.trim()) return;
    setAiParsing(true);
    window.setTimeout(() => {
      const parsed = parseAiLobbyPrompt(draft.aiPrompt);
      setDraft((d) => ({
        ...d,
        sport: parsed.sport ?? d.sport,
        venue: parsed.venue ?? d.venue,
        time: parsed.time ?? d.time,
        skillLevel: parsed.skillLevel ?? d.skillLevel,
        spotsNeeded: parsed.spotsNeeded ?? d.spotsNeeded,
        type: d.type ?? LobbyType.SINGLE_PLAYER_1,
      }));
      setAiHint('Skontroluj vyplnené polia a potvrď.');
      setAiParsing(false);
      setStep(1);
    }, 650);
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
                        <div className={scrollRow} role="list">
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
                                {sport}
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
                      <motion.div key="venue" {...panelMotion}>
                        <p className={`${sectionLabel} mb-2`}>Kde sa stretnete?</p>
                        <div className={scrollRow} role="list">
                          {VENUES.map((venue) => {
                            const active = draft.venue === venue;
                            return (
                              <button
                                key={venue}
                                type="button"
                                role="listitem"
                                onClick={() => {
                                  patch({ venue });
                                  setDetailPhase(null);
                                }}
                                className={`${chip} ${active ? chipOn : chipIdle}`}
                              >
                                {venue}
                              </button>
                            );
                          })}
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
                    <SummaryRow
                      label="Miesta"
                      value={`${draft.spotsNeeded} · ${SKILL_LEVEL_LABELS[draft.skillLevel]}`}
                    />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-transparent p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary-container/80" strokeWidth={1.75} />
                      <p className="font-label-caps text-[9px] uppercase tracking-[0.12em] text-zinc-400">
                        Alebo popíš AI
                      </p>
                    </div>
                    <textarea
                      value={draft.aiPrompt}
                      onChange={(e) => patch({ aiPrompt: e.target.value })}
                      rows={3}
                      placeholder="Hľadám 4. do padelu v piatok o 17 v Parku 21…"
                      className="w-full resize-none rounded-xl border border-white/10 bg-transparent px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-white/18"
                    />
                    <button
                      type="button"
                      onClick={runAiFill}
                      disabled={aiParsing || !draft.aiPrompt.trim()}
                      className="w-full rounded-xl border border-white/10 py-2.5 font-label-caps text-[10px] uppercase tracking-[0.12em] text-zinc-300 transition hover:border-white/16 hover:text-white disabled:opacity-40"
                    >
                      {aiParsing ? 'AI číta…' : 'Vyplniť cez AI'}
                    </button>
                    {aiHint ? (
                      <p className="font-body-sm text-xs text-primary-container/90">{aiHint}</p>
                    ) : null}
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
                <button
                  type="button"
                  disabled={!draft.type}
                  onClick={() => {
                    if (!draft.type) return;
                    onCreated(draft);
                    onClose();
                  }}
                  className="flex-1 rounded-xl border border-primary-container/35 bg-primary-container/15 py-3 font-label-caps text-[11px] text-white transition-all hover:border-primary-container/50 hover:bg-primary-container/20 active:scale-[0.98] disabled:opacity-40"
                >
                  Vytvoriť
                </button>
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
