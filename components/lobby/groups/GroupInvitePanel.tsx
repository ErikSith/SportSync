'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface GroupInvitePanelProps {
  groupId: string;
  inviteCode: string;
}

export function GroupInvitePanel({ groupId, inviteCode }: GroupInvitePanelProps) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [inviteState, setInviteState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

  const invitePath = `/lobby/groups/join/${inviteCode}`;
  const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}${invitePath}` : invitePath;

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;

    setInviteState('submitting');
    setInviteError(null);

    const res = await fetch(`/api/groups/${groupId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim() }),
    });

    const body = (await res.json().catch(() => null)) as { error?: string; username?: string } | null;

    if (!res.ok) {
      setInviteState('error');
      setInviteError(body?.error ?? 'Could not invite player');
      return;
    }

    setInviteState('success');
    setUsername('');
    router.refresh();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('idle');
    }
  }

  return (
    <section className="glass-panel rounded-xl p-6 space-y-6 border border-secondary/10">
      <div>
        <h3 className="font-headline-md text-headline-md text-on-surface mb-1">Invite Friends</h3>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Share your crew link or add players by username.
        </p>
      </div>

      <div className="space-y-2">
        <p className="font-label-caps text-label-caps text-tertiary uppercase">Invite link</p>
        <div className="flex gap-2">
          <input
            readOnly
            value={inviteUrl}
            className="flex-1 bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface-variant font-body-md text-body-md text-sm truncate"
          />
          <button
            type="button"
            onClick={() => void copyLink()}
            className="px-4 py-2 rounded-lg bg-primary-container text-white font-label-caps text-label-caps hover:brightness-110 transition-all shrink-0"
          >
            {copyState === 'copied' ? 'COPIED' : 'COPY'}
          </button>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant text-sm">
          Code: <span className="text-secondary font-mono tracking-widest">{inviteCode}</span>
        </p>
      </div>

      <form onSubmit={(e) => void handleInvite(e)} className="space-y-3">
        <div className="space-y-1">
          <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="username">
            Add by username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (inviteState === 'error') setInviteState('idle');
            }}
            placeholder="player_username"
            className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none"
          />
        </div>

        {inviteError && <p className="font-body-md text-body-md text-error">{inviteError}</p>}
        {inviteState === 'success' && (
          <p className="font-body-md text-body-md text-secondary">Player added to your crew!</p>
        )}

        <button
          type="submit"
          disabled={inviteState === 'submitting' || !username.trim()}
          className="w-full py-3 rounded-lg border border-secondary text-secondary font-label-caps text-label-caps hover:bg-secondary/10 transition-colors disabled:opacity-50"
        >
          {inviteState === 'submitting' ? 'INVITING…' : 'INVITE PLAYER'}
        </button>
      </form>
    </section>
  );
}
