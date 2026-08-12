import Link from 'next/link';
import type { GroupCardData } from '@/lib/data/sport-groups-shared';
import {
  formatGroupSchedule,
  pickLobbyActionGroup,
  pickSoonestGroupWithActivity,
  sportDisplayLabel,
  weakestCoordinationStep,
} from '@/lib/data/sport-groups-shared';

interface LobbyStatusStripProps {
  city: string | null;
  hasLocation: boolean;
  crewCount: number;
  openLobbyCount: number | null;
  groups: GroupCardData[];
}

export function LobbyStatusStrip({
  city,
  hasLocation,
  crewCount,
  openLobbyCount,
  groups,
}: LobbyStatusStripProps) {
  const actionGroup = pickLobbyActionGroup(groups);
  const soonest = pickSoonestGroupWithActivity(groups);
  const sessionGroup = actionGroup ?? soonest;
  const actionStep = actionGroup ? weakestCoordinationStep(actionGroup) : '';
  const sessionHref =
    sessionGroup?.nextActivityId
      ? `/lobby/groups/${sessionGroup.id}/sessions/${sessionGroup.nextActivityId}`
      : null;

  return (
    <section className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/60 px-3 py-1.5 min-w-0">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto no-scrollbar text-[11px] text-on-surface-variant">
        <span className="inline-flex shrink-0 items-center gap-1">
          <span
            className={`material-symbols-outlined text-[14px] ${hasLocation ? 'text-secondary' : 'text-on-surface-variant'}`}
            style={hasLocation ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            {hasLocation ? 'location_on' : 'location_off'}
          </span>
          <span className="whitespace-nowrap">
            {hasLocation ? `${city ?? 'Nearby'} (20km)` : 'Set location'}
          </span>
        </span>

        <span className="h-1 w-1 shrink-0 rounded-full bg-white/20" aria-hidden />

        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
          {hasLocation && openLobbyCount !== null
            ? `${openLobbyCount} ${openLobbyCount === 1 ? 'game looking for players' : 'games looking for players'}`
            : `${crewCount} ${crewCount === 1 ? 'crew' : 'crews'}`}
        </span>

        {actionGroup ? (
          <>
            <span className="h-1 w-1 shrink-0 rounded-full bg-white/20" aria-hidden />
            <span className="truncate min-w-0">
              <span className="font-semibold text-on-surface">{actionGroup.name}</span>
              {actionGroup.nextActivityTitle ? ` · ${actionGroup.nextActivityTitle}` : ''}
              {actionStep ? ` · ${actionStep}` : ''}
            </span>
          </>
        ) : soonest?.nextActivityAt ? (
          <>
            <span className="h-1 w-1 shrink-0 rounded-full bg-white/20" aria-hidden />
            <span className="truncate whitespace-nowrap">
              Next: {formatGroupSchedule(soonest.nextActivityAt)}
              {soonest.nextActivityTitle
                ? ` — ${soonest.nextActivityTitle}`
                : soonest.sport
                  ? ` — ${sportDisplayLabel(soonest.sport)}`
                  : ''}
            </span>
          </>
        ) : null}
      </div>

      {sessionHref && (
        <Link
          href={sessionHref}
          className="shrink-0 rounded-md bg-primary-container px-2.5 py-1 font-label-caps text-[9px] text-white hover:bg-primary-container/90 transition-colors"
        >
          {actionGroup ? 'Coordinate' : 'Open'}
        </Link>
      )}
    </section>
  );
}
