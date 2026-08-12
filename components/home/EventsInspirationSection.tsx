import Link from 'next/link';
import type { HomepageEventInspiration } from '@/lib/data/homepage';
import { EventInspirationRow } from '@/components/home/EventInspirationRow';
import { LocationPrompt } from '@/components/home/LocationPrompt';

interface EventsInspirationSectionProps {
  data: HomepageEventInspiration;
}

export function EventsInspirationSection({ data }: EventsInspirationSectionProps) {
  const { nearby, lastSpots, anchor, area, areaLabel } = data;

  const hasAnyRow = nearby.length > 0 || lastSpots.length > 0;
  const isEmpty = !hasAnyRow;

  const showLocationPrompt = anchor.source === 'city' && nearby.length === 0 && area === 'near_me';

  const nearbySubtitle =
    area === 'near_me'
      ? 'Within 20km'
      : area === 'bratislava'
        ? 'Across Bratislava'
        : `In ${areaLabel}`;

  return (
    <section className="space-y-8">
      {/* PromotedBannerSection intentionally hidden until traction — keep lib/data/promoted* + component. */}

      {lastSpots.length > 0 && (
        <EventInspirationRow
          icon="warning"
          title="Last Spots"
          subtitle="Registration filling up fast"
          events={lastSpots}
          badgeKind="lastSpots"
        />
      )}

      {nearby.length > 0 && (
        <EventInspirationRow
          icon="near_me"
          title="Near You"
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
