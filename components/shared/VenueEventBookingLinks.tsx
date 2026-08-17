import Link from 'next/link';
import { toVenueHomepageUrl } from '@/lib/venues/homepage-url';

interface VenueEventBookingLinksProps {
  venueId?: string | null;
  venueName?: string | null;
  /** Official venue website (listing/booking paths are collapsed to homepage). */
  websiteUrl?: string | null;
  eventId?: string | null;
  eventTitle?: string | null;
  className?: string;
  compact?: boolean;
  /** Muted two-column text links — lobby preview footer. */
  quiet?: boolean;
}

export function VenueEventBookingLinks({
  venueId,
  venueName,
  websiteUrl,
  eventId,
  eventTitle,
  className = '',
  compact = false,
  quiet = false,
}: VenueEventBookingLinksProps) {
  const venueSite = toVenueHomepageUrl(websiteUrl);
  if (!venueId && !eventId && !venueSite) return null;

  if (quiet) {
    const quietClass =
      'flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 font-label-caps text-[9px] uppercase tracking-[0.12em] text-zinc-400 transition-colors hover:border-white/14 hover:bg-white/[0.04] hover:text-zinc-200';
    const cols = venueSite && (venueId || eventId) ? 'grid-cols-2' : 'grid-cols-1';
    return (
      <div className={`grid ${cols} gap-2 ${className}`.trim()}>
        {venueSite ? (
          <a href={venueSite} target="_blank" rel="noopener noreferrer" className={quietClass}>
            <span className="material-symbols-outlined text-[14px] text-zinc-500">open_in_new</span>
            <span className="truncate">Web</span>
          </a>
        ) : null}
        {venueId ? (
          <Link href={`/venues/${venueId}`} className={quietClass}>
            <span className="material-symbols-outlined text-[14px] text-zinc-500">stadium</span>
            <span className="truncate">{venueName || 'Športovisko'}</span>
          </Link>
        ) : eventId ? (
          <Link href={`/events/${eventId}`} className={quietClass}>
            <span className="material-symbols-outlined text-[14px] text-zinc-500">confirmation_number</span>
            <span className="truncate">{eventTitle || 'Event'}</span>
          </Link>
        ) : null}
      </div>
    );
  }

  const buttonClass = compact
    ? 'px-3 py-1.5 rounded-lg font-label-caps text-[10px] flex items-center gap-1 transition-colors'
    : 'px-4 py-2 rounded-lg font-label-caps text-label-caps flex items-center gap-2 transition-colors';

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {venueSite ? (
        <a
          href={venueSite}
          target="_blank"
          rel="noopener noreferrer"
          className={`${buttonClass} bg-[#FF5722]/20 text-[#FF5722] border border-[#FF5722]/35 hover:bg-[#FF5722]/30`}
        >
          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          Web športoviska
        </a>
      ) : null}
      {venueId ? (
        <Link
          href={`/venues/${venueId}`}
          className={`${buttonClass} bg-secondary/20 text-secondary border border-secondary/30 hover:bg-secondary/30`}
        >
          <span className="material-symbols-outlined text-[16px]">stadium</span>
          {venueName ? `Športovisko · ${venueName}` : 'Zobraziť športovisko'}
        </Link>
      ) : null}
      {eventId ? (
        <Link
          href={`/events/${eventId}`}
          className={`${buttonClass} bg-primary-container/20 text-primary border border-primary-container/30 hover:bg-primary-container/30`}
        >
          <span className="material-symbols-outlined text-[16px]">confirmation_number</span>
          {eventTitle ? `Get tickets · ${eventTitle}` : 'Get tickets'}
        </Link>
      ) : null}
    </div>
  );
}
