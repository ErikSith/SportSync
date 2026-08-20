'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, Users } from 'lucide-react';
import type { GroupCardData } from '@/lib/data/sport-groups-shared';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { authedFetch } from '@/lib/auth/authed-fetch';

type ModalView = 'hub' | 'wizard';

const sectionLabel = 'font-label-caps text-[9px] uppercase tracking-[0.14em] text-tertiary';

function createErrorMessage(error: string | undefined): string {
  switch (error) {
    case 'Invalid group payload':
      return 'Skontroluj názov crew.';
    case 'Not authenticated':
      return 'Session na telefóne vypadla. Skús to znova — ak to nejde, obnov stránku.';
    default:
      return error ?? 'Crew sa nepodarilo vytvoriť.';
  }
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
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<ModalView>('hub');
  const [name, setName] = useState('');
  const [createState, setCreateState] = useState<'idle' | 'submitting'>('idle');
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    setView(preferWizard || groups.length === 0 ? 'wizard' : 'hub');
    setName('');
    setCreateState('idle');
    setCreateError(null);
  }, [open, groups.length, preferWizard]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  function startWizard() {
    setView('wizard');
    setName('');
    setCreateError(null);
  }

  async function handleCreate() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setCreateError('Zadaj názov crew (aspoň 2 znaky).');
      return;
    }
    if (createState === 'submitting') return;

    setCreateState('submitting');
    setCreateError(null);

    const res = await authedFetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    });

    const body = (await res.json().catch(() => null)) as {
      error?: string;
      groupId?: string;
    } | null;

    if (!res.ok || !body?.groupId) {
      setCreateState('idle');
      setCreateError(createErrorMessage(body?.error));
      return;
    }

    onCreated?.();
    onClose();
    router.push(`/lobby/groups/${body.groupId}`);
    router.refresh();
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
              {view === 'wizard' && groups.length > 0 ? (
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
                Your Crews
              </p>
              <h2 id={titleId} className="mt-0.5 font-headline-md text-[20px] text-on-surface">
                {view === 'hub' ? 'CREW' : 'Vytvorenie crew'}
              </h2>
              <p className="mt-1 font-body-md text-xs text-on-surface-variant">
                {view === 'hub'
                  ? 'Uzavretý tím pre pravidelné hry s kamarátmi.'
                  : 'Len názov — zvyšok nastavíte v crew.'}
              </p>
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
              ) : (
                <div className="space-y-2">
                  <label className={sectionLabel} htmlFor={nameId}>
                    Ako sa crew volá?
                  </label>
                  <input
                    id={nameId}
                    type="text"
                    maxLength={80}
                    autoFocus
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (createError) setCreateError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleCreate();
                      }
                    }}
                    placeholder="Sobotná partia"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-[#FF5722]/45 focus:bg-white/[0.04]"
                  />
                  {createError ? (
                    <p className="text-center text-[11px] text-error">{createError}</p>
                  ) : null}
                </div>
              )}
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
              ) : (
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
                    disabled={name.trim().length < 2 || createState === 'submitting'}
                    onClick={() => void handleCreate()}
                    className="flex-1 rounded-xl border border-primary-container/35 bg-primary-container/10 py-3 font-label-caps text-[11px] text-white transition-all hover:border-primary-container/50 hover:bg-primary-container/15 active:scale-[0.98] disabled:opacity-40"
                  >
                    {createState === 'submitting' ? 'Vytváram…' : 'Ďalej'}
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
