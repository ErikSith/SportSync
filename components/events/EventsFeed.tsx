import type { EventCardData } from '@/lib/data/events';
import type { ParticipationMode } from '@/lib/data/events';
import type { EventType } from '@/lib/constants/events';
import {
  partitionFeedForSplitTabs,
  scheduleOverviewPillLabel,
  type GroupedVenueSchedule,
  type IndependentFeedEvent,
  type PartitionedFeed,
  type VenueScheduleGroup,
} from '@/lib/feed/aggregate-routine-lessons';
import { dedupeEventsByIdentity } from '@/lib/events/event-identity';
import { EventFiltersBar } from '@/components/events/EventFiltersBar';
import { EventListItem } from '@/components/events/EventListItem';
import { GroupedVenueScheduleCard } from '@/components/events/GroupedVenueScheduleCard';
import { EventsFeedSplitTabs } from '@/components/events/EventsFeedSplitTabs';
import type { EventsFeedTab } from '@/lib/feed/events-feed-tab';

interface EventsFeedProps {
  events: EventCardData[];
  /** Unfiltered feed — kept for callers; sport chips use the full catalog. */
  allEvents?: EventCardData[];
  mode: ParticipationMode;
  typeFilter: EventType | 'ALL';
  selectedSports?: string[];
  /** YYYY-MM-DD keys with events — calendar day dots. */
  eventDayKeys?: string[];
  /** Split Feed tab: matches (Eventy) vs group lessons (Skupinové lekcie). */
  feedTab?: EventsFeedTab;
  emptyTitle: string;
  emptySubtitle: string;
}

function SectionHeader({
  title,
  subtitle,
  countLabel,
  accent = 'player',
}: {
  title: string;
  subtitle?: string;
  countLabel: string;
  accent?: 'player' | 'spectator';
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2">
          <span
            className={`h-1 w-6 rounded-full ${
              accent === 'spectator' ? 'bg-secondary' : 'bg-primary-container'
            }`}
          />
          <h2 className="font-headline-md text-[15px] tracking-wide text-on-background">{title}</h2>
        </div>
        {subtitle && (
          <p className="pl-8 font-body-md text-xs text-on-surface-variant">{subtitle}</p>
        )}
      </div>
      <span className="shrink-0 rounded-full border border-outline-variant/20 bg-surface-container-high px-2.5 py-1 font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">
        {countLabel}
      </span>
    </div>
  );
}

function UniqueEventsTimeline({
  events,
  ariaLabel,
}: {
  events: IndependentFeedEvent[];
  ariaLabel: string;
}) {
  if (events.length === 0) return null;
  return (
    <div role="list" aria-label={ariaLabel} className="flex flex-col gap-2">
      {events.map((item) => (
        <div key={item.event.id} role="listitem" className="min-w-0">
          <EventListItem event={item.event} />
        </div>
      ))}
    </div>
  );
}

function SchedulesOverviewHeader({ groups }: { groups: VenueScheduleGroup[] }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2">
          <span className="h-px w-6 bg-white/20" />
          <h2 className="font-headline-md text-[15px] font-semibold tracking-wide text-white">
            Skupinové lekcie
          </h2>
        </div>
        <p className="pl-8 font-body-md text-xs text-zinc-400">
          Opakované skupinové cvičenia podľa miesta a dňa
        </p>
      </div>
      <span className="inline-flex shrink-0 items-center rounded-full border border-white/10 bg-zinc-900/40 px-3 py-1.5 font-label-caps text-[10px] tracking-wide text-zinc-400">
        {scheduleOverviewPillLabel(groups)}
      </span>
    </div>
  );
}

function VenueSchedulesStack({ groups }: { groups: GroupedVenueSchedule[] }) {
  if (groups.length === 0) return null;

  return (
    <div className="space-y-3">
      <SchedulesOverviewHeader groups={groups} />
      <div
        role="list"
        aria-label="Skupinové lekcie"
        className="flex flex-col gap-2.5"
      >
        {groups.map((group, index) => (
          <div key={group.id} role="listitem" className="min-w-0">
            <GroupedVenueScheduleCard group={group} index={index} layout="fill" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchesFeedSection({
  title,
  subtitle,
  feed,
  accent = 'player',
  /** When false, skip section chrome — tab label already provides context. */
  showHeader = true,
}: {
  title: string;
  subtitle?: string;
  feed: PartitionedFeed;
  accent?: 'player' | 'spectator';
  showHeader?: boolean;
}) {
  if (feed.uniqueEvents.length === 0) return null;

  return (
    <section className="space-y-3">
      {showHeader ? (
        <SectionHeader
          title={title}
          subtitle={subtitle}
          countLabel={countLabel(feed.uniqueEvents.length)}
          accent={accent}
        />
      ) : null}
      <UniqueEventsTimeline events={feed.uniqueEvents} ariaLabel={title} />
    </section>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low/80 px-6 py-10 text-center">
      <span className="material-symbols-outlined mb-3 text-[32px] text-primary-container/70">event_busy</span>
      <p className="font-headline-md text-[16px] text-on-surface">{title}</p>
      <p className="mt-2 font-body-md text-sm text-on-surface-variant">{subtitle}</p>
    </div>
  );
}

function countLabel(n: number): string {
  return `${n} ${n === 1 ? 'event' : 'events'}`;
}

function toSplitFeed(events: EventCardData[]): PartitionedFeed {
  return partitionFeedForSplitTabs(events);
}

function dedupeEvents(events: EventCardData[]): EventCardData[] {
  // First by row id, then by title + local date/time (cross-source duplicates).
  const byId = new Map<string, EventCardData>();
  for (const event of events) {
    if (!byId.has(event.id)) byId.set(event.id, event);
  }
  return dedupeEventsByIdentity([...byId.values()]);
}

export function EventsFeed({
  events,
  allEvents: _allEvents,
  mode,
  typeFilter,
  selectedSports = [],
  eventDayKeys = [],
  feedTab = 'matches',
  emptyTitle,
  emptySubtitle,
}: EventsFeedProps) {
  const participate = events.filter((e) => e.participationMode === 'participate');
  const spectator = events.filter((e) => e.participationMode === 'spectator');

  const filterBar = (
    <EventFiltersBar
      mode={mode}
      typeFilter={typeFilter}
      selectedSports={selectedSports}
      eventDayKeys={eventDayKeys}
    />
  );

  const splitTabs = mode === 'participate' ? <EventsFeedSplitTabs active={feedTab} /> : null;

  const modeEvents = mode === 'spectator' ? spectator : participate;

  if (modeEvents.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        {filterBar}
        {splitTabs}
        <EmptyState title={emptyTitle} subtitle={emptySubtitle} />
      </div>
    );
  }

  const officialParticipate = participate.filter((e) => e.type === 'official');
  const communityParticipate = participate.filter((e) => e.type === 'community');
  const officialSpectator = spectator.filter((e) => e.type === 'official');
  const communitySpectator = spectator.filter((e) => e.type === 'community');

  if (mode === 'spectator') {
    const primary =
      typeFilter === 'community'
        ? communitySpectator
        : typeFilter === 'official'
          ? officialSpectator
          : officialSpectator.length > 0
            ? officialSpectator
            : spectator;

    const secondary =
      typeFilter === 'official'
        ? []
        : typeFilter === 'community'
          ? []
          : communitySpectator.filter((e) => !primary.some((p) => p.id === e.id));

    if (primary.length === 0 && secondary.length === 0) {
      return (
        <div className="flex flex-col gap-5">
          {filterBar}
          <EmptyState title={emptyTitle} subtitle={emptySubtitle} />
        </div>
      );
    }

    const primaryFeed = toSplitFeed(dedupeEvents(primary));
    const secondaryFeed = toSplitFeed(dedupeEvents(secondary));

    return (
      <div className="flex flex-col gap-7">
        {filterBar}

        <MatchesFeedSection
          title="Watch live & upcoming"
          subtitle="Official matches and shows you can attend as a spectator"
          feed={primaryFeed}
          accent="spectator"
        />

        {secondaryFeed.uniqueEvents.length > 0 && (
          <MatchesFeedSection
            title="More to watch"
            subtitle="Community sessions open for spectators"
            feed={secondaryFeed}
            accent="spectator"
          />
        )}
      </div>
    );
  }

  // Participate mode — Split Feed tabs (strict: no spectator bleed)
  const playerSource =
    typeFilter === 'community'
      ? communityParticipate
      : typeFilter === 'official'
        ? officialParticipate
        : participate;

  const playerGrid = dedupeEvents(playerSource);
  const playerFeed = toSplitFeed(playerGrid);

  const showMatches = feedTab === 'matches';
  const showSchedules = feedTab === 'schedules';

  const matchesEmpty = showMatches && playerFeed.uniqueEvents.length === 0;

  const schedulesEmpty = showSchedules && playerFeed.venueGroupedSchedules.length === 0;
  const hasScheduleGroups = playerFeed.venueGroupedSchedules.length > 0;

  // After scrape, repeating group lessons live only on Skupinové lekcie. Don't
  // strand the default Eventy tab on a blank empty-state when lessons exist.
  const revealSchedulesOnEmptyMatches = matchesEmpty && hasScheduleGroups;

  if (playerGrid.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        {filterBar}
        {splitTabs}
        <EmptyState title={emptyTitle} subtitle={emptySubtitle} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {filterBar}
      {splitTabs}

      {showMatches && (
        <div className="flex flex-col gap-7">
          {matchesEmpty ? (
            revealSchedulesOnEmptyMatches ? null : (
              <EmptyState
                title="Žiadne eventy ani zápasy v okolí."
                subtitle="Komunitné zápasy a jednorazové eventy sa tu zobrazia, keď ich niekto vytvorí. Opakované cvičenia zo športovísk sú v tabe Skupinové lekcie."
              />
            )
          ) : (
            <MatchesFeedSection
              title={typeFilter === 'community' ? 'Community games' : 'Eventy & Zápasy'}
              subtitle={
                typeFilter === 'community'
                  ? 'Player-organized matches near you'
                  : 'Jednorazové zápasy, turnaje a komunitné eventy'
              }
              feed={playerFeed}
              accent="player"
              showHeader={false}
            />
          )}
        </div>
      )}

      {(showSchedules || revealSchedulesOnEmptyMatches) &&
        (hasScheduleGroups ? (
          <VenueSchedulesStack groups={playerFeed.venueGroupedSchedules} />
        ) : schedulesEmpty ? (
          <EmptyState
            title="Žiadne skupinové lekcie v okolí."
            subtitle="Opakované skupinové cvičenia zo športovísk sa tu zobrazia podľa dňa."
          />
        ) : null)}
    </div>
  );
}
