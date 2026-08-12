import Link from 'next/link';
import type { FavoriteVenue } from '@/lib/data/profile-venues';

interface ProfileVenuesSectionProps {
  venues: FavoriteVenue[];
}

function formatLastPlayed(date: Date | null): string | null {
  if (!date) return null;

  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / 86_400_000);

  if (days < 0) return 'Upcoming';
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;

  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function ProfileVenuesSection({ venues }: ProfileVenuesSectionProps) {
  if (venues.length === 0) return null;

  return (
    <section className="glass-panel rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-xl">location_on</span>
          Favorite Venues
        </h2>
        <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">From your matches</span>
      </div>

      <div className="flex flex-col gap-3">
        {venues.slice(0, 3).map((venue) => {
          const lastPlayed = formatLastPlayed(venue.lastVisitedAt);

          return (
            <Link
              key={venue.id}
              href={`/venues/${venue.id}`}
              className="flex items-center gap-4 bg-surface-container/40 p-3 rounded-lg border border-white/5 hover:bg-surface-container transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-surface-container-high border border-white/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-secondary">stadium</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-headline-md text-sm text-on-surface truncate">{venue.name}</h4>
                  {venue.verified && (
                    <span className="material-symbols-outlined text-primary-container text-base shrink-0">verified</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">{venue.city}</span>
                  {venue.topSport && (
                    <span className="font-label-caps text-[10px] uppercase px-2 py-0.5 rounded-full bg-primary-container/20 text-primary-container">
                      {venue.topSport}
                    </span>
                  )}
                  {lastPlayed && (
                    <span className="font-label-caps text-[10px] text-on-surface-variant">{lastPlayed}</span>
                  )}
                </div>
              </div>

              <span className="font-label-caps text-[10px] uppercase text-secondary shrink-0">
                {venue.visits}×
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
