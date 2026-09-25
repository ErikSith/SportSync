import type { EventCardData } from '@/lib/data/events';
import { isProgramEvent } from '@/lib/programs/classify';
import { looksLikeNavOrSectionTitle } from '@/lib/feed/group-class';
import type { ParticipationMode } from '@/lib/data/events';
import type { EventType } from '@/lib/constants/events';
import { t } from '@/lib/i18n/server';
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
import { EventAtmosphereTab } from '@/components/events/EventAtmosphereTab';
import { GroupedVenueScheduleCard } from '@/components/events/GroupedVenueScheduleCard';
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
          <span className="h-1 w-6 rounded-full bg-[#E53935]" />
          <h2 className="font-headline-md text-[15px] tracking-wide text-on-background">{title}</h2>
        </div>
        {subtitle && (
          <p className="pl-8 font-body-md text-xs text-on-surface-variant">{subtitle}</p>
        )}
      </div>
      <span className="shrink-0 rounded-full border border-[#E53935]/30 bg-[#E53935]/10 px-2.5 py-1 font-label-caps text-[10px] uppercase tracking-wider text-[#ffc9c6]">
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
    <div
      role="list"
      aria-label={ariaLabel}
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5"
    >
      {events.map((item, index) => (
        <div key={item.event.id} role="listitem" className="min-w-0">
          <EventAtmosphereTab event={item.event} index={index} layout="fill" />
        </div>
      ))}
    </div>
  );
}

function SchedulesOverviewHeader({ groups }: { groups: VenueScheduleGroup[] }) {
  return (
    <div className="flex justify-end">
      <span className="shrink-0 rounded-full border border-[#8EB4C8]/30 bg-[#8EB4C8]/10 px-2.5 py-1 font-label-caps text-[10px] uppercase tracking-wider text-[#c5d9e6]">
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
        aria-label={t('events.tab.schedules')}
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

function EmptyState({
  title,
  subtitle,
  tone = 'events',
}: {
  title: string;
  subtitle: string;
  tone?: 'events' | 'schedules';
}) {
  const isSchedules = tone === 'schedules';
  return (
    <div
      className={`rounded-2xl border bg-transparent px-6 py-10 text-center ${
        isSchedules ? 'border-[#8EB4C8]/20' : 'border-[#E53935]/20'
      }`}
    >
      <span
        className={`material-symbols-outlined mb-3 text-[32px] ${
          isSchedules ? 'text-[#8EB4C8]/70' : 'text-[#E53935]/70'
        }`}
      >
        {isSchedules ? 'fitness_center' : 'celebration'}
      </span>
      <p className="font-headline-md text-[16px] text-on-surface">{title}</p>
      <p className="mt-2 font-body-md text-sm text-on-surface-variant">{subtitle}</p>
    </div>
  );
}

function countLabel(n: number): string {
  return n === 1 ? t('events.countOne', { n }) : t('events.count', { n });
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
  const listingEvents = events.filter(
    (event) => !isProgramEvent(event) && !looksLikeNavOrSectionTitle(event.title),
  );
  const participate = listingEvents.filter((e) => e.participationMode === 'participate');
  const spectator = listingEvents.filter((e) => e.participationMode === 'spectator');

  const filterBar = (
    <EventFiltersBar
      mode={mode}
      typeFilter={typeFilter}
      selectedSports={selectedSports}
      eventDayKeys={eventDayKeys}
      accent={feedTab === 'schedules' ? 'sky' : 'red'}
    />
  );

  const modeEvents = mode === 'spectator' ? spectator : participate;

  if (modeEvents.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        {filterBar}
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
          title={t('events.watchLive')}
          subtitle={t('events.watchLiveSub')}
          feed={primaryFeed}
          accent="spectator"
        />

        {secondaryFeed.uniqueEvents.length > 0 && (
          <MatchesFeedSection
            title={t('events.moreWatch')}
            subtitle={t('events.moreWatchSub')}
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

  const showSchedules = feedTab === 'schedules';
  const matchesEmpty = !showSchedules && playerFeed.uniqueEvents.length === 0;
  const schedulesEmpty = showSchedules && playerFeed.venueGroupedSchedules.length === 0;
  const hasScheduleGroups = playerFeed.venueGroupedSchedules.length > 0;

  if (playerGrid.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        {filterBar}
        <EmptyState title={emptyTitle} subtitle={emptySubtitle} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {filterBar}

      {showSchedules ? (
        hasScheduleGroups ? (
          <VenueSchedulesStack groups={playerFeed.venueGroupedSchedules} />
        ) : schedulesEmpty ? (
          <EmptyState
            title={emptyTitle}
            subtitle={emptySubtitle}
            tone="schedules"
          />
        ) : null
      ) : (
        <div className="flex flex-col gap-7">
          {matchesEmpty ? (
            <EmptyState
              title={t('events.empty.matchesTitle')}
              subtitle={t('events.empty.matchesSub')}
            />
          ) : (
            <MatchesFeedSection
              title={typeFilter === 'community' ? t('events.communityGames') : t('events.eventsMatches')}
              subtitle={
                typeFilter === 'community'
                  ? t('events.communityGamesSub')
                  : t('events.eventsMatchesSub')
              }
              feed={playerFeed}
              accent="player"
              showHeader={false}
            />
          )}
        </div>
      )}
    </div>
  );
}
