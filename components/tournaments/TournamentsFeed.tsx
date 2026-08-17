import type { TournamentCardData } from '@/lib/data/tournaments';
import type { ParticipationMode } from '@/lib/data/events';
import { TournamentFiltersBar } from '@/components/tournaments/TournamentFiltersBar';
import { TournamentAtmosphereTab } from '@/components/tournaments/TournamentAtmosphereTab';
import type { TournamentStatusFilter } from '@/components/tournaments/TournamentFilterChips';

interface TournamentsFeedProps {
  tournaments: TournamentCardData[];
  allTournaments?: TournamentCardData[];
  statusFilter: TournamentStatusFilter;
  mode: ParticipationMode;
  selectedSports?: string[];
  eventDayKeys?: string[];
  emptyTitle: string;
  emptySubtitle: string;
}

function countLabel(n: number): string {
  return `${n} ${n === 1 ? 'cup' : 'cups'}`;
}

export function TournamentsFeed({
  tournaments,
  allTournaments: _allTournaments,
  statusFilter,
  mode,
  selectedSports = [],
  eventDayKeys = [],
  emptyTitle,
  emptySubtitle,
}: TournamentsFeedProps) {
  const isSpectator = mode === 'spectator';

  return (
    <div className="flex flex-col gap-5">
      <TournamentFiltersBar
        statusFilter={statusFilter}
        mode={mode}
        selectedSports={selectedSports}
        eventDayKeys={eventDayKeys}
      />

      {tournaments.length === 0 ? (
        <div className="rounded-2xl border border-secondary/20 bg-[#16140f]/80 px-6 py-10 text-center">
          <span
            className="material-symbols-outlined mb-3 text-[32px] text-secondary/70"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {isSpectator ? 'visibility' : 'emoji_events'}
          </span>
          <p className="font-headline-md text-[16px] text-on-surface">{emptyTitle}</p>
          <p className="mt-2 font-body-md text-sm text-on-surface-variant">{emptySubtitle}</p>
        </div>
      ) : (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                <span className="h-1 w-6 rounded-full bg-[#c4a035]" />
                <h2 className="font-headline-md text-[15px] tracking-wide text-on-background">
                  {isSpectator ? 'Watch cups' : 'Open cups'}
                </h2>
              </div>
              <p className="pl-8 font-body-md text-xs text-on-surface-variant">
                {isSpectator
                  ? 'Vstupenky a divácke spektákle — sleduj zo tribúny'
                  : 'Otvorené prihlášky — zapoj sa ako hráč'}
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-[#c4a035]/30 bg-[#c4a035]/10 px-2.5 py-1 font-label-caps text-[10px] uppercase tracking-wider text-[#e8d59a]">
              {countLabel(tournaments.length)}
            </span>
          </div>

          <div
            role="list"
            aria-label="Tournaments"
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5"
          >
            {tournaments.map((tournament, index) => (
              <div key={tournament.id} role="listitem" className="min-w-0">
                <TournamentAtmosphereTab tournament={tournament} index={index} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
