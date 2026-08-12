import Link from 'next/link';
import type { HomepageEventInspiration } from '@/lib/data/homepage';
import { EventInspirationRow } from '@/components/home/EventInspirationRow';
import { LocationPrompt } from '@/components/home/LocationPrompt';

interface EventsInspirationSectionProps {
  data: HomepageEventInspiration;
}

export function EventsInspirationSection({ data }: EventsInspirationSectionProps) {
  const { nearby, lastSpots, startingSoon, anchor, area, areaLabel, usedAllEventsFallback, fallbackMessage } =
    data;

  const hasAnyRow = nearby.length > 0 || lastSpots.length > 0 || startingSoon.length > 0;
  const isEmpty = !hasAnyRow;

  const showLocationPrompt =
    !usedAllEventsFallback &&
    anchor.source === 'city' &&
    nearby.length === 0 &&
    area === 'near_me';

  const nearbySubtitle = usedAllEventsFallback
    ? 'All available events'
    : area === 'near_me'
      ? 'Within 20km'
      : area === 'bratislava'
        ? 'Across Bratislava'
        : `In ${areaLabel}`;

  return (
    <section className="space-y-8">
      {/* PromotedBannerSection intentionally hidden until traction — keep lib/data/promoted* + component. */}

      {usedAllEventsFallback && hasAnyRow && (
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-outline-variant/15" />
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase text-center text-xs">
            {fallbackMessage ?? 'Showing all available events'}
          </span>
          <div className="h-px flex-1 bg-outline-variant/15" />
        </div>
      )}

      {lastSpots.length > 0 && (
        <EventInspirationRow
          icon="warning"
          title="Last Spots"
          subtitle="Registration filling up fast"
          events={lastSpots}
          badgeKind="lastSpots"
        />
      )}

      {startingSoon.length > 0 && (
        <EventInspirationRow
          icon="schedule"
          title="Coming up"
          subtitle="Next 7 days"
          events={startingSoon}
          badgeKind="distance"
        />
      )}

      {nearby.length > 0 && (
        <EventInspirationRow
          icon="near_me"
          title={usedAllEventsFallback ? 'Available Events' : 'Near You'}
          subtitle={nearbySubtitle}
          events={nearby}
          badgeKind="distance"
        />
      )}

      {showLocationPrompt && <LocationPrompt />}

      {isEmpty && (
        <div className="glass-card space-y-3 rounded-xl p-6 text-center">
          <p className="font-body-md text-body-md text-on-surface">No events near you yet.</p>
          <Link
            href="/events"
            className="font-label-caps text-label-caps text-secondary hover:text-secondary-fixed"
          >
            EXPLORE ALL EVENTS
          </Link>
        </div>
      )}
    </section>
  );
}
