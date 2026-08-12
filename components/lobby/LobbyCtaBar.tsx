'use client';

import Link from 'next/link';
import { Plus, Sparkles } from 'lucide-react';

interface LobbyCtaBarProps {
  onQuickMatch: () => void;
  quickBusy?: boolean;
}

export function LobbyCtaBar({ onQuickMatch, quickBusy = false }: LobbyCtaBarProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
      <Link
        href="/lobby/create"
        className={[
          'inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3',
          'bg-primary-container text-sm font-semibold text-white',
          'transition hover:bg-primary-container/90 active:scale-[0.98]',
        ].join(' ')}
      >
        <Plus className="h-4 w-4" strokeWidth={2.25} />
        Create lobby
      </Link>

      <button
        type="button"
        onClick={onQuickMatch}
        disabled={quickBusy}
        className={[
          'inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3',
          'border border-white/10 bg-zinc-900/40 text-sm font-medium text-zinc-200',
          'transition hover:border-white/15 hover:bg-zinc-900/60 active:scale-[0.98] disabled:opacity-70',
        ].join(' ')}
      >
        <Sparkles className={`h-4 w-4 text-primary-container/80 ${quickBusy ? 'animate-pulse' : ''}`} />
        {quickBusy ? 'Finding…' : 'Quick match'}
      </button>
    </div>
  );
}
