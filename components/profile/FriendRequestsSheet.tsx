'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import type { FriendRequestView } from '@/lib/data/profile-friends';
import { initialsFromName } from '@/lib/utils/initials';

interface FriendRequestsSheetProps {
  open: boolean;
  onClose: () => void;
  requests: FriendRequestView[];
}

export function FriendRequestsSheet({ open, onClose, requests }: FriendRequestsSheetProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
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

  async function handleAccept(id: string) {
    setActing(id);
    await fetch(`/api/friends/${id}/accept`, { method: 'POST' });
    setActing(null);
    router.refresh();
  }

  async function handleDecline(id: string) {
    setActing(id);
    await fetch(`/api/friends/${id}/decline`, { method: 'POST' });
    setActing(null);
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
        className="glass-panel rounded-2xl p-6 w-full max-w-md border border-secondary/10 space-y-4 max-h-[80vh] overflow-y-auto relative z-[101]"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-headline-md text-headline-md text-on-surface">Friend requests</h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-secondary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {requests.length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant text-sm py-4 text-center">No pending requests</p>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map((request) => {
              const name = request.requester.fullName ?? request.requester.username;
              const initials = initialsFromName(name);

              return (
                <div
                  key={request.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-surface-container/40 border border-white/5"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0 bg-surface-container-high flex items-center justify-center">
                    {request.requester.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={request.requester.avatarUrl} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-label-caps text-xs text-on-surface">{initials}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-headline-md text-sm text-on-surface truncate">{name}</p>
                    <p className="font-label-caps text-[10px] text-on-surface-variant">@{request.requester.username}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={acting === request.id}
                      onClick={() => void handleAccept(request.id)}
                      className="p-2 rounded-lg bg-secondary/20 text-secondary hover:bg-secondary/30 disabled:opacity-50"
                      aria-label="Accept"
                    >
                      <span className="material-symbols-outlined text-lg">check</span>
                    </button>
                    <button
                      type="button"
                      disabled={acting === request.id}
                      onClick={() => void handleDecline(request.id)}
                      className="p-2 rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface disabled:opacity-50"
                      aria-label="Decline"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
