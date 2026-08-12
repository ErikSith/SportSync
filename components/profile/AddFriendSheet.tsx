'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

interface AddFriendSheetProps {
  open: boolean;
  onClose: () => void;
}

export function AddFriendSheet({ open, onClose }: AddFriendSheetProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setUsername('');
    setError(null);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = username.trim().replace(/^@/, '');
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);

    const res = await fetch('/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: trimmed }),
    });

    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    setSubmitting(false);

    if (!res.ok) {
      setError(body?.error ?? 'Could not send request');
      return;
    }

    onClose();
    router.refresh();
  }

  if (!open || !mounted) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="glass-panel rounded-2xl p-6 w-full max-w-md border border-secondary/10 space-y-4 relative z-[101]"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-headline-md text-headline-md text-on-surface">Add friend</h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-secondary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1">
            <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@username"
              className="w-full rounded-lg bg-surface-container border border-white/10 px-3 py-2 text-on-surface"
              autoFocus
            />
          </label>

          {error && <p className="text-primary text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full font-label-caps text-label-caps uppercase px-4 py-2.5 rounded-lg bg-secondary text-on-secondary disabled:opacity-50"
          >
            {submitting ? 'Sending…' : 'Send request'}
          </button>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
