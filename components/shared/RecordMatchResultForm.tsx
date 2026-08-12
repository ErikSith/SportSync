'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface RecordMatchResultFormProps {
  sport: string;
  contextType: 'lobby' | 'tournament' | 'group_session' | 'lesson';
  contextId: string;
  participants: Array<{ id: string; name: string }>;
}

export function RecordMatchResultForm({ sport, contextType, contextId, participants }: RecordMatchResultFormProps) {
  const router = useRouter();
  const [winnerId, setWinnerId] = useState('');
  const [score, setScore] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (participants.length < 2) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!winnerId) return;
    setError(null);

    const res = await fetch('/api/matches/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sport,
        contextType,
        contextId,
        participantIds: participants.map((p) => p.id),
        winnerId,
        score: score ? { raw: score } : {},
      }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? 'Could not record result');
      return;
    }

    setDone(true);
    startTransition(() => router.refresh());
  }

  if (done) {
    return (
      <div className="glass-panel rounded-xl p-4 border border-secondary/30 text-secondary font-label-caps text-label-caps text-center">
        RESULT RECORDED ✓
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="glass-panel rounded-xl p-4 border border-outline-variant/30 space-y-3">
      <h4 className="font-label-caps text-label-caps text-tertiary uppercase">Record match result</h4>
      <select
        value={winnerId}
        onChange={(e) => setWinnerId(e.target.value)}
        required
        className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface font-body-md text-body-md"
      >
        <option value="">Select winner…</option>
        {participants.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={score}
        onChange={(e) => setScore(e.target.value)}
        placeholder="Score (optional)"
        className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface font-body-md text-body-md"
      />
      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2 rounded-lg bg-primary-container text-white font-label-caps text-label-caps disabled:opacity-50"
      >
        {isPending ? 'SAVING…' : 'RECORD RESULT'}
      </button>
      {error && <p className="text-error text-xs">{error}</p>}
    </form>
  );
}
