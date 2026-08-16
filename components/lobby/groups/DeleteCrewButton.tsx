'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DeleteCrewButtonProps {
  groupId: string;
  groupName: string;
  /** Compact outline style for header actions. */
  variant?: 'header' | 'danger';
}

export function DeleteCrewButton({
  groupId,
  groupName,
  variant = 'header',
}: DeleteCrewButtonProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [state, setState] = useState<'idle' | 'deleting'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setState('deleting');
    setError(null);

    const res = await fetch(`/api/groups/${groupId}`, { method: 'DELETE' });
    const body = (await res.json().catch(() => null)) as { error?: string } | null;

    if (!res.ok) {
      setState('idle');
      setError(
        body?.error === 'Only the crew admin can delete this group'
          ? 'Mazanie môže len admin (owner) tejto crew.'
          : (body?.error ?? 'Crew sa nepodarilo odstrániť.'),
      );
      return;
    }

    setConfirmOpen(false);
    router.push('/lobby');
    router.refresh();
  }

  const triggerClass =
    variant === 'danger'
      ? 'inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-400 transition hover:bg-red-500/20 active:scale-[0.98]'
      : 'inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-transparent px-4 py-2.5 text-xs font-bold text-red-400 transition hover:border-red-500/50 hover:bg-red-500/10 active:scale-[0.98]';

  return (
    <>
      <button type="button" onClick={() => setConfirmOpen(true)} className={triggerClass}>
        <span className="material-symbols-outlined text-[16px]" aria-hidden>
          delete
        </span>
        Odstrániť crew
      </button>

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-[140] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          role="presentation"
          onClick={() => {
            if (state === 'deleting') return;
            setConfirmOpen(false);
            setError(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-crew-title"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1F1F1F] p-5 shadow-2xl shadow-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-red-400">
              Nevratná akcia
            </p>
            <h3 id="delete-crew-title" className="mt-1 text-lg font-bold text-white">
              Odstrániť „{groupName}”?
            </h3>
            <p className="mt-2 text-sm text-gray-400">
              Crew zmizne pre všetkých členov vrátane aktivít a pozvánok. Túto akciu nemôžeš vrátiť
              späť.
            </p>

            {error ? <p className="mt-3 text-xs text-red-400">{error}</p> : null}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                disabled={state === 'deleting'}
                onClick={() => void handleDelete()}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-500 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {state === 'deleting' ? 'Mažem…' : 'Áno, odstrániť'}
              </button>
              <button
                type="button"
                disabled={state === 'deleting'}
                onClick={() => {
                  setConfirmOpen(false);
                  setError(null);
                }}
                className="flex-1 rounded-xl border border-white/15 px-4 py-2.5 text-xs font-bold text-gray-300 transition hover:border-white/25 hover:text-white disabled:opacity-50"
              >
                Zrušiť
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
