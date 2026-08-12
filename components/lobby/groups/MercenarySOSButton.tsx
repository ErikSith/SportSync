'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface MercenarySOSButtonProps {
  groupId: string;
  sessionId: string;
  openToMercenaries: boolean;
  spotsNeeded: number | null;
  mercenaryLobbyId: string | null;
  goingCount: number;
}

export function MercenarySOSButton({
  groupId,
  sessionId,
  openToMercenaries,
  spotsNeeded,
  mercenaryLobbyId,
  goingCount,
}: MercenarySOSButtonProps) {
  const router = useRouter();
  const [spotsInput, setSpotsInput] = useState(spotsNeeded ? String(spotsNeeded) : '4');
  const [savingSettings, setSavingSettings] = useState(false);
  const [sendingSos, setSendingSos] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsMorePlayers = openToMercenaries && spotsNeeded !== null && goingCount < spotsNeeded;

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = parseInt(spotsInput, 10);
    if (Number.isNaN(parsed) || parsed < 2) {
      setError('Enter a valid target headcount (2+).');
      return;
    }

    setSavingSettings(true);
    const res = await fetch(`/api/groups/${groupId}/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ openToMercenaries: true, spotsNeeded: parsed }),
    });
    setSavingSettings(false);

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? 'Could not save settings');
      return;
    }

    router.refresh();
  }

  async function disableMercenaries() {
    setError(null);
    await fetch(`/api/groups/${groupId}/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ openToMercenaries: false }),
    });
    router.refresh();
  }

  async function sendSos() {
    setError(null);
    setSendingSos(true);
    const res = await fetch(`/api/groups/${groupId}/sessions/${sessionId}/mercenary`, { method: 'POST' });
    setSendingSos(false);

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? 'Could not call mercenaries');
      return;
    }

    router.refresh();
  }

  if (mercenaryLobbyId) {
    return (
      <section className="glass-panel rounded-xl p-6 border border-secondary/30 space-y-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-[22px]">campaign</span>
          <h3 className="font-headline-md text-headline-md text-on-surface">Mercenary SOS is live</h3>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant text-sm">
          We&apos;ve broadcast an open call for extra players. Track responses in the public lobby.
        </p>
        <Link
          href={`/lobby/${mercenaryLobbyId}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/20 text-secondary border border-secondary/30 font-label-caps text-label-caps hover:bg-secondary/30 transition-colors"
        >
          VIEW MERCENARY LOBBY
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </section>
    );
  }

  return (
    <section className="glass-panel rounded-xl p-6 border border-error/20 space-y-4">
      <div>
        <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-error text-[22px]">sos</span>
          Open to Mercenaries
        </h3>
        <p className="font-body-md text-body-md text-on-surface-variant text-sm mt-1">
          Short on players? Broadcast an SOS to nearby players via a public lobby.
        </p>
      </div>

      <form onSubmit={(e) => void saveSettings(e)} className="flex items-end gap-3">
        <div className="space-y-1 flex-1">
          <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="spots-needed">
            Target headcount
          </label>
          <input
            id="spots-needed"
            type="number"
            min="2"
            max="30"
            value={spotsInput}
            onChange={(e) => setSpotsInput(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={savingSettings}
          className="px-4 py-2 rounded-lg border border-outline-variant/40 text-on-surface-variant font-label-caps text-label-caps hover:bg-surface-container transition-colors disabled:opacity-50"
        >
          {savingSettings ? 'SAVING…' : openToMercenaries ? 'UPDATE' : 'ENABLE'}
        </button>
        {openToMercenaries && (
          <button
            type="button"
            onClick={() => void disableMercenaries()}
            className="px-3 py-2 text-on-surface-variant hover:text-error transition-colors"
            aria-label="Disable mercenaries"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </form>

      {openToMercenaries && spotsNeeded !== null && (
        <p className="font-body-md text-body-md text-on-surface-variant text-sm">
          {goingCount}/{spotsNeeded} confirmed
          {needsMorePlayers ? ` • ${spotsNeeded - goingCount} more needed` : ' • Crew is full!'}
        </p>
      )}

      {error && <p className="font-body-md text-body-md text-error text-sm">{error}</p>}

      {needsMorePlayers && (
        <button
          type="button"
          onClick={() => void sendSos()}
          disabled={sendingSos}
          className="w-full py-4 rounded-lg bg-error text-on-error font-label-caps text-label-caps glow-hover transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">sos</span>
          {sendingSos ? 'BROADCASTING…' : 'CALL MERCENARIES'}
        </button>
      )}
    </section>
  );
}
