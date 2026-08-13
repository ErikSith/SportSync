'use client';

import type { MatchCardData } from '@/types/lobby';
import { LobbyActivityCard } from '@/components/lobby/LobbyActivityCard';

interface LobbyGridProps {
  matches: MatchCardData[];
  onAction?: (id: string) => void;
  busyId?: string | null;
  emptyMessage?: string;
}

export function LobbyGrid({
  matches,
  onAction,
  busyId = null,
  emptyMessage = 'No matches in this category.',
}: LobbyGridProps) {
  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low px-6 py-12 text-center text-sm text-on-surface-variant">
        {emptyMessage}
      </div>
    );
  }

  return (
    <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {matches.map((match) => (
        <LobbyActivityCard key={match.id} match={match} onView={onAction} busyId={busyId} />
      ))}
    </section>
  );
}
