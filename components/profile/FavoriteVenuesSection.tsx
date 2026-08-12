import Link from 'next/link';
import type { FavoriteVenue } from '@/lib/data/profile-venues';

interface FavoriteVenuesSectionProps {
  venues: FavoriteVenue[];
  embedded?: boolean;
}

function formatLastPlayed(date: Date | null): string | null {
  if (!date) return null;

  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / 86_400_000);

  if (days < 0) return 'Upcoming';
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function FavoriteVenuesSection({ venues, embedded = false }: FavoriteVenuesSectionProps) {
  if (venues.length === 0) return null;

  return (
    <div className={embedded ? 'flex flex-col gap-3' : 'glass-panel rounded-xl p-6 md:p-8 flex flex-col gap-4'}>
      <div className={embedded ? 'flex justify-between items-center' : 'flex justify-between items-end border-b border-white/10 pb-4 mb-2'}>
        <h2 className={embedded ? 'font-label-caps text-[10px] uppercase text-on-surface-variant tracking-widest' : 'font-headline-md text-headline-md text-on-surface'}>
          Favorite Venues
        </h2>
        {!embedded && (
          <span className="text-secondary font-label-caps text-label-caps uppercase opacity-60">Home Turf</span>
        )}
      </div>

      <div className="flex flex-col gap-3">
          {venues.map((venue) => {
            const lastPlayed = formatLastPlayed(venue.lastVisitedAt);

            return (
              <Link
                key={venue.id}
                href={`/venues/${venue.id}`}
                className="flex items-center gap-4 bg-surface-container/40 p-4 rounded-lg border border-white/5 hover:bg-surface-container transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-surface-container-high border border-white/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-secondary">location_on</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-headline-md text-[18px] text-on-surface leading-tight truncate">{venue.name}</h4>
                    {venue.verified && (
                      <span className="material-symbols-outlined text-primary-container text-base shrink-0">verified</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">{venue.city}</span>
                    {venue.topSport && (
                      <span className="font-label-caps text-label-caps uppercase px-2 py-0.5 rounded-full bg-primary-container/20 text-primary-container">
                        {venue.topSport}
                      </span>
                    )}
                    {lastPlayed && (
                      <span className="font-label-caps text-label-caps text-on-surface-variant">Last played {lastPlayed}</span>
                    )}
                  </div>
                </div>

                <div className="text-right flex items-center gap-1 text-secondary shrink-0">
                  <span className="material-symbols-outlined text-sm">history</span>
                  <span className="font-label-caps text-label-caps uppercase">
                    {venue.visits} visit{venue.visits === 1 ? '' : 's'}
                  </span>
                </div>
              </Link>
            );
          })}
      </div>
    </div>
  );
}
