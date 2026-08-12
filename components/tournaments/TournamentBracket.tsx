'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PollRefresh } from '@/lib/realtime/usePollingRefresh';

export interface BracketMatch {
  id: string;
  round: number;
  slot: number;
  participant1Id: string | null;
  participant2Id: string | null;
  participant1Name: string | null;
  participant2Name: string | null;
  winnerId: string | null;
  status: string;
  score: string | null;
}

export interface BracketRound {
  round: number;
  label: string;
  matches: BracketMatch[];
}

interface TournamentBracketProps {
  tournamentId: string;
  initialRounds: BracketRound[];
  sport: string;
  canManage?: boolean;
}

export function TournamentBracket({
  tournamentId,
  initialRounds,
  sport,
  canManage = false,
}: TournamentBracketProps) {
  const router = useRouter();
  const [rounds, setRounds] = useState(initialRounds);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function generateBracket() {
    setError(null);
    const res = await fetch(`/api/tournaments/${tournamentId}/bracket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate' }),
    });
    const body = (await res.json().catch(() => null)) as { rounds?: BracketRound[]; error?: string } | null;
    if (!res.ok) {
      setError(body?.error ?? 'Could not generate bracket');
      return;
    }
    setRounds(body?.rounds ?? []);
    startTransition(() => router.refresh());
  }

  async function reportResult(matchId: string, winnerId: string) {
    setError(null);
    const res = await fetch(`/api/tournaments/${tournamentId}/bracket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'report', matchId, winnerId, score: 'W', sport }),
    });
    const body = (await res.json().catch(() => null)) as { rounds?: BracketRound[]; error?: string } | null;
    if (!res.ok) {
      setError(body?.error ?? 'Could not report result');
      return;
    }
    setRounds(body?.rounds ?? []);
    startTransition(() => router.refresh());
  }

  if (rounds.length === 0) {
    return (
      <section className="glass-panel rounded-xl p-6 border border-secondary/20 space-y-4">
        <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">account_tree</span>
          Tournament Bracket
        </h3>
        <p className="font-body-md text-body-md text-on-surface-variant">
          No bracket generated yet. Once registration closes, generate the bracket to start the tournament.
        </p>
        {canManage && (
          <button
            type="button"
            onClick={() => void generateBracket()}
            disabled={isPending}
            className="py-3 px-6 rounded-lg bg-primary-container text-white font-label-caps text-label-caps disabled:opacity-50"
          >
            {isPending ? 'GENERATING…' : 'GENERATE BRACKET'}
          </button>
        )}
        {error && <p className="text-error text-sm">{error}</p>}
      </section>
    );
  }

  return (
    <section className="glass-panel rounded-xl p-6 border border-secondary/20 space-y-6">
      <PollRefresh intervalMs={20000} />
      <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
        <span className="material-symbols-outlined text-secondary">account_tree</span>
        Tournament Bracket
      </h3>
      <div className="overflow-x-auto">
        <div className="flex gap-8 min-w-max pb-4">
          {rounds.map((round) => (
            <div key={round.round} className="flex flex-col gap-4 min-w-[200px]">
              <h4 className="font-label-caps text-label-caps text-secondary uppercase text-center">{round.label}</h4>
              {round.matches.map((match) => (
                <div
                  key={match.id}
                  className="glass-card rounded-lg p-3 border border-outline-variant/30 space-y-2"
                >
                  <MatchSlot
                    name={match.participant1Name}
                    isWinner={match.winnerId === match.participant1Id}
                    canSelect={canManage && match.status === 'pending' && !!match.participant1Id && !!match.participant2Id}
                    onSelect={() => match.participant1Id && void reportResult(match.id, match.participant1Id)}
                  />
                  <div className="h-px bg-outline-variant/30" />
                  <MatchSlot
                    name={match.participant2Name}
                    isWinner={match.winnerId === match.participant2Id}
                    canSelect={canManage && match.status === 'pending' && !!match.participant1Id && !!match.participant2Id}
                    onSelect={() => match.participant2Id && void reportResult(match.id, match.participant2Id)}
                  />
                  {match.status === 'completed' && match.score && (
                    <p className="text-xs text-tertiary-container text-center">{match.score}</p>
                  )}
                  {match.status === 'walkover' && (
                    <p className="text-xs text-tertiary-container text-center italic">Bye</p>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      {error && <p className="text-error text-sm">{error}</p>}
    </section>
  );
}

function MatchSlot({
  name,
  isWinner,
  canSelect,
  onSelect,
}: {
  name: string | null;
  isWinner: boolean;
  canSelect: boolean;
  onSelect: () => void;
}) {
  const content = (
    <span
      className={`font-body-md text-body-md block py-1 px-2 rounded ${
        isWinner ? 'bg-secondary/20 text-secondary font-semibold' : 'text-on-surface'
      } ${canSelect ? 'hover:bg-surface-container cursor-pointer' : ''}`}
    >
      {name ?? 'TBD'}
    </span>
  );

  if (canSelect) {
    return (
      <button type="button" onClick={onSelect} className="w-full text-left">
        {content}
      </button>
    );
  }
  return content;
}
