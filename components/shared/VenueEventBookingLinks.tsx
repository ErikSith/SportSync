import Link from 'next/link';

interface VenueEventBookingLinksProps {
  venueId?: string | null;
  venueName?: string | null;
  eventId?: string | null;
  eventTitle?: string | null;
  className?: string;
  compact?: boolean;
}

export function VenueEventBookingLinks({
  venueId,
  venueName,
  eventId,
  eventTitle,
  className = '',
  compact = false,
}: VenueEventBookingLinksProps) {
  if (!venueId && !eventId) return null;

  const buttonClass = compact
    ? 'px-3 py-1.5 rounded-lg font-label-caps text-[10px] flex items-center gap-1 transition-colors'
    : 'px-4 py-2 rounded-lg font-label-caps text-label-caps flex items-center gap-2 transition-colors';

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {venueId && (
        <Link
          href={`/venues/${venueId}`}
          className={`${buttonClass} bg-secondary/20 text-secondary border border-secondary/30 hover:bg-secondary/30`}
        >
          <span className="material-symbols-outlined text-[16px]">stadium</span>
          {venueName ? `Book at ${venueName}` : 'View venue'}
        </Link>
      )}
      {eventId && (
        <Link
          href={`/events/${eventId}`}
          className={`${buttonClass} bg-primary-container/20 text-primary border border-primary-container/30 hover:bg-primary-container/30`}
        >
          <span className="material-symbols-outlined text-[16px]">confirmation_number</span>
          {eventTitle ? `Get tickets · ${eventTitle}` : 'Get tickets'}
        </Link>
      )}
    </div>
  );
}
