'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Link2,
  PenLine,
  Share2,
  UserPlus,
  Users,
} from 'lucide-react';
import type { GroupCardData } from '@/lib/data/sport-groups-shared';
import { LOBBY_SPORTS, type LobbySport } from '@/lib/constants/sports';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

type WizardStep = 0 | 1 | 2;
type ModalView = 'hub' | 'wizard';
type DetailPhase = 'name' | 'sport' | 'description';

interface CreateCrewDraft {
  name: string;
  sport: LobbySport | '';
  description: string;
  groupId?: string;
  inviteCode?: string;
  invitedUsernames: string[];
}

const EMPTY_DRAFT: CreateCrewDraft = {
  name: '',
  sport: '',
  description: '',
  invitedUsernames: [],
};

const SPORT_LABELS_SK: Record<LobbySport, string> = {
  TENNIS: 'Tenis',
  PADEL: 'Padel',
  SQUASH: 'Squash',
  RUNNING: 'Beh',
  FOOTBALL: 'Futbal',
  BASKETBALL: 'Basketbal',
  VOLLEYBALL: 'Volejbal',
  HOCKEY: 'Hokej',
};

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

function inviteErrorMessage(error: string | undefined): string {
  switch (error) {
    case 'Player not found':
      return 'Hráč s týmto menom nebol nájdený.';
    case 'Player is already in this crew':
      return 'Už je členom tejto crew.';
    case 'You are already in this crew':
      return 'Už si v tejto crew.';
    default:
      return error ?? 'Pozvanie sa nepodarilo.';
  }
}

function createErrorMessage(error: string | undefined): string {
  switch (error) {
    case 'Invalid group payload':
      return 'Skontroluj názov a šport crew.';
    default:
      return error ?? 'Crew sa nepodarilo vytvoriť.';
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

interface CreateCrewModalProps {
  open: boolean;
  onClose: () => void;
  groups?: GroupCardData[];
  onCreated?: () => void;
  /** When true, open directly on the create wizard even if user already has crews. */
  preferWizard?: boolean;
}

export function CreateCrewModal({
  open,
  onClose,
  groups = [],
  onCreated,
  preferWizard = false,
}: CreateCrewModalProps) {
  const titleId = useId();
  const nameId = useId();
  const descId = useId();
  const usernameId = useId();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<ModalView>('hub');
  const [step, setStep] = useState<WizardStep>(0);
  const [detailPhase, setDetailPhase] = useState<DetailPhase | null>('name');
  const [draft, setDraft] = useState<CreateCrewDraft>(EMPTY_DRAFT);
  const [createState, setCreateState] = useState<'idle' | 'submitting'>('idle');
  const [createError, setCreateError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [inviteState, setInviteState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

  useEffect(() => setMounted(true), []);
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    setView(preferWizard || groups.length === 0 ? 'wizard' : 'hub');
    setStep(0);
    setDetailPhase('name');
    setDraft(EMPTY_DRAFT);
    setCreateState('idle');
    setCreateError(null);
    setUsername('');
    setInviteState('idle');
    setInviteError(null);
    setCopyState('idle');
  }, [open, groups.length, preferWizard]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (step !== 0) setDetailPhase(null);
  }, [step]);

  const invitePath =
    draft.inviteCode != null ? `/lobby/groups/join/${draft.inviteCode}` : '';
  const inviteUrl =
    typeof window !== 'undefined' && invitePath
      ? `${window.location.origin}${invitePath}`
      : invitePath;

  function patch(partial: Partial<CreateCrewDraft>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  function startWizard() {
    setView('wizard');
    setStep(0);
    setDetailPhase('name');
    setDraft(EMPTY_DRAFT);
    setCreateError(null);
  }

  function canNextBasics() {
    return Boolean(draft.name.trim() && draft.sport);
  }

  async function handleCreateAndContinue() {
    if (!canNextBasics() || createState === 'submitting') return;
    if (!draft.sport) return;

    setCreateState('submitting');
    setCreateError(null);

    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: draft.name.trim(),
        sport: draft.sport,
        description: draft.description.trim() || undefined,
      }),
    });

    const body = (await res.json().catch(() => null)) as {
      error?: string;
      groupId?: string;
      inviteCode?: string;
    } | null;

    if (!res.ok || !body?.groupId || !body.inviteCode) {
      setCreateState('idle');
      setCreateError(createErrorMessage(body?.error));
      return;
    }

    setDraft((d) => ({
      ...d,
      groupId: body.groupId,
      inviteCode: body.inviteCode,
    }));
    setCreateState('idle');
    onCreated?.();
    setStep(1);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !draft.groupId) return;

    setInviteState('submitting');
    setInviteError(null);

    const res = await fetch(`/api/groups/${draft.groupId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim() }),
    });

    const body = (await res.json().catch(() => null)) as { error?: string; username?: string } | null;

    if (!res.ok) {
      setInviteState('error');
      setInviteError(inviteErrorMessage(body?.error));
      return;
    }

    const invited = body?.username ?? username.trim();
    setDraft((d) => ({
      ...d,
      invitedUsernames: [...d.invitedUsernames, invited],
    }));
    setInviteState('success');
    setUsername('');
    onCreated?.();
  }

  async function copyLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('idle');
    }
  }

  async function shareLink() {
    if (!inviteUrl || !draft.name) return;
    const text = `Pridaj sa do našej crew „${draft.name}" na SportSync — stiahni appku a pripoj sa cez link:`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Pozvánka do crew', text, url: inviteUrl });
      } else {
        await copyLink();
      }
    } catch {
      /* user cancelled share */
    }
  }

  function openCrewHub() {
    if (!draft.groupId) return;
    onClose();
    router.push(`/lobby/groups/${draft.groupId}`);
  }

  const headerTitle =
    view === 'hub' ? 'CREW' : step === 0 ? 'Vytvorenie crew' : step === 1 ? 'Pozvi kamarátov' : 'Hotovo';

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
              {view === 'wizard' && groups.length > 0 && step === 0 ? (
                <button
                  type="button"
                  onClick={() => setView('hub')}
                  className="absolute left-3 top-3 text-on-surface-variant transition-colors hover:text-primary"
                  aria-label="Späť"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-3 text-on-surface-variant transition-colors hover:text-primary"
                aria-label="Zavrieť"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
              <p className="font-label-caps text-[10px] uppercase tracking-[0.18em] text-primary-container">
                My Crew
              </p>
              <h2 id={titleId} className="mt-0.5 font-headline-md text-[20px] text-on-surface">
                {headerTitle}
              </h2>
              {view === 'wizard' ? (
                <>
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
                </>
              ) : (
                <p className="mt-1 font-body-md text-xs text-on-surface-variant">
                  Uzavretý tím pre pravidelné hry s kamarátmi.
                </p>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {view === 'hub' ? (
                <div className="space-y-4">
                  {groups.length > 0 ? (
                    <div className="space-y-2">
                      <p className={sectionLabel}>Tvoje crew</p>
                      <div className="flex flex-col gap-1.5">
                        {groups.map((group) => (
                          <Link
                            key={group.id}
                            href={`/lobby/groups/${group.id}`}
                            onClick={onClose}
                            className="flex items-center justify-between rounded-2xl border border-white/10 bg-transparent px-3.5 py-3.5 transition-colors hover:border-white/16 hover:bg-white/[0.02]"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-body-sm text-sm text-white">{group.name}</p>
                              <p className="mt-0.5 font-body-sm text-xs text-zinc-500">
                                {group.memberCount}{' '}
                                {group.memberCount === 1
                                  ? 'člen'
                                  : group.memberCount < 5
                                    ? 'členovia'
                                    : 'členov'}
                              </p>
                            </div>
                            <Users className="h-4 w-4 shrink-0 text-zinc-500" strokeWidth={1.75} />
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={startWizard}
                    className="flex w-full items-center gap-3 rounded-2xl border border-primary-container/30 bg-primary-container/8 px-3.5 py-3.5 text-left transition-colors hover:border-primary-container/40"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary-container/25 bg-primary-container/10 text-primary-container">
                      <Users className="h-4 w-4" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-body-sm text-sm text-white">Vytvoriť novú crew</p>
                      <p className="mt-0.5 font-body-sm text-xs text-zinc-500">
                        Len ľudia s tvojím linkom sa môžu pripojiť
                      </p>
                    </div>
                  </button>
                </div>
              ) : null}

              {view === 'wizard' && step === 0 ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Postup vyplnenia">
                    <StepChip
                      icon={PenLine}
                      label={draft.name.trim() || null}
                      active={detailPhase === 'name'}
                      done={Boolean(draft.name.trim())}
                      onClick={() =>
                        setDetailPhase((phase) => (phase === 'name' ? null : 'name'))
                      }
                    />
                    {draft.name.trim() ? (
                      <StepChip
                        icon={Activity}
                        label={draft.sport ? SPORT_LABELS_SK[draft.sport] : null}
                        active={detailPhase === 'sport'}
                        done={Boolean(draft.sport)}
                        onClick={() =>
                          setDetailPhase((phase) => (phase === 'sport' ? null : 'sport'))
                        }
                      />
                    ) : null}
                    {draft.name.trim() && draft.sport ? (
                      <StepChip
                        icon={FileText}
                        label={draft.description.trim() ? 'Popis' : null}
                        active={detailPhase === 'description'}
                        done={Boolean(draft.description.trim())}
                        onClick={() =>
                          setDetailPhase((phase) =>
                            phase === 'description' ? null : 'description',
                          )
                        }
                      />
                    ) : null}
                  </div>

                  {!detailPhase && !draft.name.trim() ? (
                    <p className="font-body-sm text-xs text-zinc-500">
                      Klikni na ikonu a zadaj názov crew.
                    </p>
                  ) : null}

                  <AnimatePresence mode="wait">
                    {detailPhase === 'name' ? (
                      <motion.div key="name" className="space-y-2" {...panelMotion}>
                        <p className={sectionLabel}>Ako sa crew volá?</p>
                        <input
                          id={nameId}
                          type="text"
                          maxLength={80}
                          autoFocus
                          value={draft.name}
                          onChange={(e) => {
                            patch({ name: e.target.value });
                            if (createError) setCreateError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && draft.name.trim()) {
                              e.preventDefault();
                              setDetailPhase(null);
                            }
                          }}
                          placeholder="Sobotná partia"
                          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-[#FF5722]/45 focus:bg-white/[0.04]"
                        />
                      </motion.div>
                    ) : null}

                    {detailPhase === 'sport' ? (
                      <motion.div key="sport" {...panelMotion}>
                        <p className={`${sectionLabel} mb-2`}>Hlavný šport</p>
                        <div className={scrollRow} role="list">
                          {LOBBY_SPORTS.map((sport) => {
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
                                {SPORT_LABELS_SK[sport]}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    ) : null}

                    {detailPhase === 'description' ? (
                      <motion.div key="description" className="space-y-2" {...panelMotion}>
                        <p className={sectionLabel}>Popis (voliteľné)</p>
                        <textarea
                          id={descId}
                          rows={3}
                          maxLength={500}
                          autoFocus
                          value={draft.description}
                          onChange={(e) => patch({ description: e.target.value })}
                          placeholder="Pravidelná padel partia v Bratislave — víkendy, nenáročná atmosféra."
                          className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-[#FF5722]/45 focus:bg-white/[0.04]"
                        />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  {createError ? (
                    <p className="text-center text-[11px] text-error">{createError}</p>
                  ) : null}
                </div>
              ) : null}

              {view === 'wizard' && step === 1 ? (
                <div className="space-y-5">
                  <div className="space-y-2.5 rounded-2xl border border-white/10 bg-transparent px-4 py-4">
                    <SummaryRow label="Názov" value={draft.name || '—'} />
                    <SummaryRow
                      label="Šport"
                      value={draft.sport ? SPORT_LABELS_SK[draft.sport] : '—'}
                    />
                    {draft.description.trim() ? (
                      <SummaryRow label="Popis" value={draft.description.trim()} />
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <p className={sectionLabel}>Invite link</p>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={inviteUrl}
                        className="min-w-0 flex-1 truncate rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-400 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => void copyLink()}
                        className="shrink-0 rounded-xl border border-primary-container/35 bg-primary-container/10 px-3 py-2 font-label-caps text-[9px] uppercase tracking-[0.1em] text-white transition hover:bg-primary-container/15"
                      >
                        {copyState === 'copied' ? 'OK' : 'Kopírovať'}
                      </button>
                    </div>
                    {draft.inviteCode ? (
                      <p className="px-1 text-[11px] text-zinc-500">
                        Kód:{' '}
                        <span className="font-mono tracking-widest text-zinc-300">
                          {draft.inviteCode}
                        </span>
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void shareLink()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 font-label-caps text-[9px] uppercase tracking-[0.1em] text-zinc-300 transition hover:border-white/16 hover:bg-white/[0.03]"
                    >
                      <Share2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Zdieľať pozvánku
                    </button>
                  </div>

                  <form onSubmit={(e) => void handleInvite(e)} className="space-y-2">
                    <p className={sectionLabel}>Pridať podľa mena</p>
                    <div className="flex gap-2">
                      <input
                        id={usernameId}
                        type="text"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value);
                          if (inviteState === 'error') setInviteState('idle');
                        }}
                        placeholder="username"
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#FF5722]/45"
                      />
                      <button
                        type="submit"
                        disabled={inviteState === 'submitting' || !username.trim()}
                        className="shrink-0 rounded-xl border border-primary-container/35 bg-primary-container/10 px-3 py-2 font-label-caps text-[9px] uppercase tracking-[0.1em] text-white transition hover:bg-primary-container/15 disabled:opacity-40"
                      >
                        {inviteState === 'submitting' ? '…' : 'Pozvať'}
                      </button>
                    </div>
                    {inviteError ? <p className="text-[11px] text-error">{inviteError}</p> : null}
                    {inviteState === 'success' ? (
                      <p className="text-[11px] text-zinc-400">Hráč bol pridaný do crew.</p>
                    ) : null}
                  </form>

                  {draft.invitedUsernames.length > 0 ? (
                    <div className="space-y-1.5">
                      <p className={sectionLabel}>Pozvaní</p>
                      <div className="flex flex-wrap gap-1.5">
                        {draft.invitedUsernames.map((u) => (
                          <span
                            key={u}
                            className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-1.5 font-body-sm text-xs text-zinc-300"
                          >
                            <UserPlus className="h-3 w-3 text-primary-container" strokeWidth={1.75} />
                            @{u}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 px-3 py-4 text-center">
                      <Link2 className="mx-auto mb-2 h-4 w-4 text-zinc-500" strokeWidth={1.75} />
                      <p className="font-body-sm text-xs text-zinc-500">
                        Zatiaľ si sám — pošli link aspoň jednému kamarátovi.
                      </p>
                    </div>
                  )}
                </div>
              ) : null}

              {view === 'wizard' && step === 2 ? (
                <div className="space-y-5">
                  <div className="space-y-2.5 rounded-2xl border border-white/10 bg-transparent px-4 py-4">
                    <SummaryRow label="Názov" value={draft.name || '—'} />
                    <SummaryRow
                      label="Šport"
                      value={draft.sport ? SPORT_LABELS_SK[draft.sport] : '—'}
                    />
                    <SummaryRow
                      label="Členovia"
                      value={`${1 + draft.invitedUsernames.length}`}
                    />
                    {draft.inviteCode ? (
                      <SummaryRow label="Kód" value={draft.inviteCode} />
                    ) : null}
                  </div>
                  <p className="text-center font-body-sm text-xs leading-relaxed text-zinc-500">
                    V crew hube môžeš naplánovať prvú session alebo pozvať ďalších hráčov.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 gap-2 border-t border-white/5 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
              {view === 'hub' ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-outline/30 py-3 font-label-caps text-[11px] text-on-surface-variant transition-colors hover:text-on-surface"
                >
                  Zavrieť
                </button>
              ) : step === 0 ? (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-xl border border-outline/30 py-3 font-label-caps text-[11px] text-on-surface-variant transition-colors hover:text-on-surface"
                  >
                    Zrušiť
                  </button>
                  <button
                    type="button"
                    disabled={!canNextBasics() || createState === 'submitting'}
                    onClick={() => void handleCreateAndContinue()}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-primary-container/35 bg-primary-container/10 py-3 font-label-caps text-[11px] text-white transition-all hover:border-primary-container/50 hover:bg-primary-container/15 active:scale-[0.98] disabled:opacity-40"
                  >
                    {createState === 'submitting' ? 'Vytváram…' : 'Ďalej'}
                    {createState !== 'submitting' ? (
                      <ChevronRight className="h-3.5 w-3.5" />
                    ) : null}
                  </button>
                </>
              ) : step === 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 rounded-xl border border-outline/30 py-3 font-label-caps text-[11px] text-on-surface-variant transition-colors hover:text-on-surface"
                  >
                    Preskočiť
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-primary-container/35 bg-primary-container/15 py-3 font-label-caps text-[11px] text-white transition-all hover:border-primary-container/50 hover:bg-primary-container/20 active:scale-[0.98]"
                  >
                    Hotovo
                    <Check className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-xl border border-outline/30 py-3 font-label-caps text-[11px] text-on-surface-variant transition-colors hover:text-on-surface"
                  >
                    Zavrieť
                  </button>
                  <button
                    type="button"
                    onClick={openCrewHub}
                    className="flex-1 rounded-xl border border-primary-container/35 bg-primary-container/15 py-3 font-label-caps text-[11px] text-white transition-all hover:border-primary-container/50 hover:bg-primary-container/20 active:scale-[0.98]"
                  >
                    Otvoriť crew
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
