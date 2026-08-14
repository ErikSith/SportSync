import type { HomepageEventInspiration } from '@/lib/data/homepage';
import { EventInspirationRow } from '@/components/home/EventInspirationRow';

interface EventsInspirationSectionProps {
  data: HomepageEventInspiration;
}

export function EventsInspirationSection({ data }: EventsInspirationSectionProps) {
  const { lastSpots, usedAllEventsFallback, fallbackMessage } = data;

  if (lastSpots.length === 0) return null;

  return (
    <section className="space-y-8">
      {usedAllEventsFallback && (
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-outline-variant/15" />
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase text-center text-xs">
            {fallbackMessage ?? 'Showing all available events'}
          </span>
          <div className="h-px flex-1 bg-outline-variant/15" />
        </div>
      )}

      <EventInspirationRow
        icon="warning"
        title="Last Spots"
        subtitle="Registration filling up fast"
        events={lastSpots}
        badgeKind="lastSpots"
      />
    </section>
  );
}
