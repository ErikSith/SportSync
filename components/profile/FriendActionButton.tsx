'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FriendshipRelation } from '@/lib/data/profile-friends';

interface FriendActionButtonProps {
  targetUsername: string;
  relation: FriendshipRelation;
  friendshipId?: string | null;
}

export function FriendActionButton({ targetUsername, relation, friendshipId = null }: FriendActionButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [localRelation, setLocalRelation] = useState(relation);

  async function sendRequest() {
    setLoading(true);
    const res = await fetch('/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: targetUsername }),
    });
    setLoading(false);
    if (res.ok) {
      setLocalRelation('pending_outgoing');
      router.refresh();
    }
  }

  async function unfriend() {
    if (!friendshipId) return;
    setLoading(true);
    await fetch(`/api/friends/${friendshipId}`, { method: 'DELETE' });
    setLoading(false);
    setLocalRelation('none');
    router.refresh();
  }

  if (localRelation === 'friends') {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={() => void unfriend()}
        className="font-label-caps text-[10px] uppercase px-4 py-2 rounded-lg border border-secondary/30 text-secondary hover:bg-secondary/10 transition-colors disabled:opacity-50"
      >
        Friends
      </button>
    );
  }

  if (localRelation === 'pending_outgoing') {
    return (
      <span className="font-label-caps text-[10px] uppercase px-4 py-2 rounded-lg border border-white/10 text-on-surface-variant">
        Request sent
      </span>
    );
  }

  if (localRelation === 'pending_incoming') {
    return (
      <span className="font-label-caps text-[10px] uppercase px-4 py-2 rounded-lg border border-secondary/30 text-secondary">
        Respond in your profile
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void sendRequest()}
      className="font-label-caps text-[10px] uppercase px-4 py-2 rounded-lg bg-secondary text-on-secondary disabled:opacity-50"
    >
      Add friend
    </button>
  );
}
