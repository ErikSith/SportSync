'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, Link2, Share2, UserPlus, Users } from 'lucide-react';
import type { GroupCardData } from '@/lib/data/sport-groups-shared';
import { LOBBY_SPORTS, type LobbySport } from '@/lib/constants/sports';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

type WizardStep = 0 | 1 | 2;
type ModalView = 'hub' | 'wizard';

interface CreateCrewDraft {
  name: string;
  sport: LobbySport;
  description: string;
  groupId?: string;
  inviteCode?: string;
  invitedUsernames: string[];
}

const EMPTY_DRAFT: CreateCrewDraft = {
  name: '',
  sport: LOBBY_SPORTS[1],
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
const inputClass =
  'w-full rounded-lg border border-outline-variant/40 bg-surface-container px-3 py-2 font-body-md text-sm text-on-surface focus:border-primary-container focus:outline-none';

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

interface CreateCrewModalProps {
  open: boolean;
  onClose: () => void;
  groups?: GroupCardData[];
  onCreated?: () => void;
}

export function CreateCrewModal({ open, onClose, groups = [], onCreated }: CreateCrewModalProps) {
  const titleId = useId();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<ModalView>('hub');
  const [step, setStep] = useState<WizardStep>(0);
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
    setView(groups.length > 0 ? 'hub' : 'wizard');
    setStep(0);
    setDraft(EMPTY_DRAFT);
    setCreateState('idle');
    setCreateError(null);
    setUsername('');
    setInviteState('idle');
    setInviteError(null);
    setCopyState('idle');
  }, [open, groups.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const invitePath =
    draft.inviteCode != null ? `/lobby/groups/join/${draft.inviteCode}` : '';
  const inviteUrl =
    typeof window !== 'undefined' && invitePath
      ? `${window.location.origin}${invitePath}`
      : invitePath;

  function startWizard() {
    setView('wizard');
    setStep(0);
    setDraft(EMPTY_DRAFT);
    setCreateError(null);
  }

  async function handleCreate() {
    if (!draft.name.trim()) {
      setCreateError('Zadaj názov crew.');
      return;
    }

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

  const wizardTitle =
    step === 0 ? 'Vytvor crew' : step === 1 ? 'Pozvi kamarátov' : 'Crew je pripravená';

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
            className="glass-panel relative z-[101] flex max-h-[min(88dvh,560px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative shrink-0 border-b border-white/5 px-5 pb-3 pt-5 text-center">
              {view === 'wizard' && (step === 2 || (step === 0 && groups.length > 0)) ? (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 2) setStep(1);
                    else setView('hub');
                  }}
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
              <p className="font-label-caps text-[10px] uppercase tracking-[0.18em] text-secondary">
                My Crew
              </p>
              <h2 id={titleId} className="mt-1 font-headline-md text-[20px] text-on-surface">
                {view === 'hub' ? 'CREW' : wizardTitle.toUpperCase()}
              </h2>
              <p className="mt-1 font-body-md text-xs text-on-surface-variant">
                {view === 'hub'
                  ? 'Uzavretý tím pre pravidelné hry s kamarátmi.'
                  : step === 1
                    ? 'Pošli link — nech si stiahnu SportSync a pripoja sa.'
                    : step === 2
                      ? 'Ďalšiu aktivitu naplánuješ v crew hube.'
                      : 'Len ľudia s tvojím linkom sa môžu pripojiť.'}
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
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
                            className="flex items-center justify-between rounded-xl border border-white/10 bg-transparent px-3 py-2.5 transition hover:border-white/18 hover:bg-white/[0.03]"
                          >
                            <span className="truncate font-body-sm text-sm text-white">{group.name}</span>
                            <span className="shrink-0 font-label-caps text-[9px] uppercase tracking-[0.1em] text-zinc-500">
                              {group.memberCount}{' '}
                              {group.memberCount === 1 ? 'člen' : group.memberCount < 5 ? 'členovia' : 'členov'}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={startWizard}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary-container/25 bg-primary-container/10 py-3.5 font-label-caps text-[10px] uppercase tracking-[0.12em] text-white transition hover:border-primary-container/35 hover:bg-primary-container/15 active:scale-[0.98]"
                  >
                    <Users className="h-4 w-4 text-primary-container" strokeWidth={1.75} />
                    Vytvoriť novú crew
                  </button>
                </div>
              ) : (
                <>
                  <div className={`${scrollRow} mb-4`}>
                    {(['Základ', 'Pozvania', 'Hotovo'] as const).map((label, i) => {
                      const idx = i as WizardStep;
                      const active = step === idx;
                      const done = step > idx;
                      return (
                        <span
                          key={label}
                          className={[
                            chip,
                            active ? chipOn : done ? 'border-white/12 bg-white/[0.03] text-zinc-300' : chipIdle,
                          ].join(' ')}
                        >
                          {done ? <Check className="h-3 w-3" strokeWidth={2} /> : null}
                          {label}
                        </span>
                      );
                    })}
                  </div>

                  <AnimatePresence mode="wait">
                    {step === 0 ? (
                      <motion.div key="step-0" {...panelMotion} className="space-y-4">
                        <div className="space-y-1">
                          <label className={sectionLabel} htmlFor="crew-name">
                            Názov crew
                          </label>
                          <input
                            id="crew-name"
                            type="text"
                            maxLength={80}
                            value={draft.name}
                            onChange={(e) => {
                              setDraft((d) => ({ ...d, name: e.target.value }));
                              if (createError) setCreateError(null);
                            }}
                            placeholder="Sobotná partia"
                            className={inputClass}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <p className={sectionLabel}>Hlavný šport</p>
                          <div className={scrollRow}>
                            {LOBBY_SPORTS.map((sport) => (
                              <button
                                key={sport}
                                type="button"
                                onClick={() => setDraft((d) => ({ ...d, sport }))}
                                className={[chip, draft.sport === sport ? chipOn : chipIdle].join(' ')}
                              >
                                {SPORT_LABELS_SK[sport]}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className={sectionLabel} htmlFor="crew-desc">
                            Popis (voliteľné)
                          </label>
                          <textarea
                            id="crew-desc"
                            rows={2}
                            maxLength={500}
                            value={draft.description}
                            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                            placeholder="Pravidelná padel partia v Bratislave — víkendy, nenáročná atmosféra."
                            className={`${inputClass} resize-none`}
                          />
                        </div>

                        {createError ? (
                          <p className="font-body-md text-sm text-error">{createError}</p>
                        ) : null}
                      </motion.div>
                    ) : null}

                    {step === 1 ? (
                      <motion.div key="step-1" {...panelMotion} className="space-y-5">
                        <div className="space-y-2">
                          <p className={sectionLabel}>Invite link</p>
                          <div className="flex gap-2">
                            <input
                              readOnly
                              value={inviteUrl}
                              className={`${inputClass} truncate text-on-surface-variant`}
                            />
                            <button
                              type="button"
                              onClick={() => void copyLink()}
                              className="shrink-0 rounded-lg bg-primary-container px-3 py-2 font-label-caps text-[9px] uppercase tracking-[0.1em] text-white transition hover:brightness-110"
                            >
                              {copyState === 'copied' ? 'Skopírované' : 'Kopírovať'}
                            </button>
                          </div>
                          {draft.inviteCode ? (
                            <p className="font-body-sm text-xs text-on-surface-variant">
                              Kód:{' '}
                              <span className="font-mono tracking-widest text-secondary">{draft.inviteCode}</span>
                            </p>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => void shareLink()}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-secondary/30 py-2.5 font-label-caps text-[9px] uppercase tracking-[0.1em] text-secondary transition hover:bg-secondary/10"
                          >
                            <Share2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                            Zdieľať pozvánku
                          </button>
                          <p className="font-body-sm text-[11px] leading-relaxed text-zinc-500">
                            Kamarát otvorí link, stiahne si SportSync a pripojí sa do tvojej uzavretej crew.
                          </p>
                        </div>

                        <form onSubmit={(e) => void handleInvite(e)} className="space-y-3">
                          <div className="space-y-1">
                            <label className={sectionLabel} htmlFor="crew-username">
                              Pridať podľa mena
                            </label>
                            <div className="flex gap-2">
                              <input
                                id="crew-username"
                                type="text"
                                value={username}
                                onChange={(e) => {
                                  setUsername(e.target.value);
                                  if (inviteState === 'error') setInviteState('idle');
                                }}
                                placeholder="username"
                                className={inputClass}
                              />
                              <button
                                type="submit"
                                disabled={inviteState === 'submitting' || !username.trim()}
                                className="shrink-0 rounded-lg border border-secondary px-3 py-2 font-label-caps text-[9px] uppercase tracking-[0.1em] text-secondary transition hover:bg-secondary/10 disabled:opacity-50"
                              >
                                {inviteState === 'submitting' ? '…' : 'Pozvať'}
                              </button>
                            </div>
                          </div>

                          {inviteError ? (
                            <p className="font-body-md text-sm text-error">{inviteError}</p>
                          ) : null}
                          {inviteState === 'success' ? (
                            <p className="font-body-md text-sm text-secondary">Hráč bol pridaný do crew!</p>
                          ) : null}
                        </form>

                        {draft.invitedUsernames.length > 0 ? (
                          <div className="space-y-1.5">
                            <p className={sectionLabel}>Pozvaní</p>
                            <div className="flex flex-wrap gap-1.5">
                              {draft.invitedUsernames.map((u) => (
                                <span
                                  key={u}
                                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-body-sm text-xs text-zinc-300"
                                >
                                  <UserPlus className="h-3 w-3 text-secondary" strokeWidth={1.75} />
                                  @{u}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-4 text-center">
                            <Link2 className="mx-auto mb-2 h-4 w-4 text-zinc-500" strokeWidth={1.75} />
                            <p className="font-body-sm text-xs text-zinc-500">
                              Zatiaľ si sám — pošli link aspoň jednému kamarátovi.
                            </p>
                          </div>
                        )}
                      </motion.div>
                    ) : null}

                    {step === 2 ? (
                      <motion.div key="step-2" {...panelMotion} className="space-y-4 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-secondary/30 bg-secondary/10">
                          <Check className="h-7 w-7 text-secondary" strokeWidth={2} />
                        </div>
                        <div>
                          <p className="font-headline-md text-lg text-on-surface">
                            „{draft.name}" je pripravená
                          </p>
                          <p className="mt-1 font-body-md text-sm text-on-surface-variant">
                            {SPORT_LABELS_SK[draft.sport]} ·{' '}
                            {1 + draft.invitedUsernames.length}{' '}
                            {1 + draft.invitedUsernames.length === 1
                              ? 'člen'
                              : 1 + draft.invitedUsernames.length < 5
                                ? 'členovia'
                                : 'členov'}
                          </p>
                        </div>
                        <p className="font-body-sm text-xs leading-relaxed text-zinc-500">
                          V crew hube môžeš naplánovať prvú aktivitu, nastaviť opakovaný termín alebo
                          pozvať ďalších hráčov.
                        </p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </>
              )}
            </div>

            <div className="shrink-0 space-y-2 border-t border-white/5 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
              {view === 'hub' ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-xl border border-outline/30 py-3 font-label-caps text-[11px] text-on-surface-variant transition-colors hover:text-on-surface"
                >
                  Zavrieť
                </button>
              ) : step === 0 ? (
                <button
                  type="button"
                  disabled={createState === 'submitting' || !draft.name.trim()}
                  onClick={() => void handleCreate()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-container py-3 font-label-caps text-[10px] uppercase tracking-[0.12em] text-white transition active:scale-[0.98] disabled:opacity-50"
                >
                  {createState === 'submitting' ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[16px]">
                        progress_activity
                      </span>
                      Vytváram…
                    </>
                  ) : (
                    <>
                      Ďalej — pozvať kamarátov
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </>
                  )}
                </button>
              ) : step === 1 ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 rounded-xl border border-outline/30 py-3 font-label-caps text-[10px] uppercase tracking-[0.1em] text-on-surface-variant transition-colors hover:text-on-surface"
                  >
                    Preskočiť
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary-container py-3 font-label-caps text-[10px] uppercase tracking-[0.1em] text-white transition active:scale-[0.98]"
                  >
                    Hotovo
                    <Check className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={openCrewHub}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary-container py-3 font-label-caps text-[10px] uppercase tracking-[0.1em] text-white transition active:scale-[0.98]"
                  >
                    Otvoriť crew hub
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-xl border border-outline/30 py-3 font-label-caps text-[10px] uppercase tracking-[0.1em] text-on-surface-variant transition-colors hover:text-on-surface"
                  >
                    Zavrieť
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
