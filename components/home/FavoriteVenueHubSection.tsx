import Link from 'next/link';
import type { FavoriteVenue } from '@/lib/data/homepage';
import type { TournamentCardData } from '@/lib/data/tournaments';
import { ListingCover } from '@/components/shared/ListingCover';

function formatTournamentWhen(startsAt: Date): string {
  const now = new Date();
  const isToday = startsAt.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = startsAt.toDateString() === tomorrow.toDateString();

  if (isToday) return 'Today';
  if (isTomorrow) return 'Tomorrow';
  return startsAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function TournamentAtVenueItem({ tournament, index }: { tournament: TournamentCardData; index: number }) {
  const cover = tournament.coverUrl;
  const spotsLeft = tournament.maxParticipants - tournament.currentParticipants;

  return (
    <Link
      href="/tournaments"
      className={`glass-card p-4 rounded-xl flex items-center gap-4 group cursor-pointer border-l-4 relative overflow-hidden ${
        index % 2 === 0 ? 'border-l-secondary' : 'border-l-primary-container'
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-secondary/20 relative z-10">
        <ListingCover className="w-full h-full object-cover" src={cover} alt={tournament.name} />
      </div>

      <div className="flex-grow min-w-0 relative z-10">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-label-caps text-label-caps text-[10px] text-secondary uppercase">Tournament</span>
          <span className="font-label-caps text-label-caps text-[10px] text-on-surface-variant">•</span>
          <span className="font-label-caps text-label-caps text-[10px] text-primary uppercase">{tournament.sport}</span>
          {tournament.status === 'IN_PROGRESS' && (
            <>
              <span className="font-label-caps text-label-caps text-[10px] text-on-surface-variant">•</span>
              <span className="font-label-caps text-label-caps text-[10px] text-primary uppercase">Live</span>
            </>
          )}
        </div>
        <h4 className="font-headline-md text-[16px] font-semibold text-on-surface truncate group-hover:text-secondary transition-colors">
          {tournament.name}
        </h4>
        <p className="font-body-md text-xs text-on-surface-variant flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">schedule</span>
            {formatTournamentWhen(tournament.startsAt)}
          </span>
          {tournament.venueName && (
            <span className="flex items-center gap-1 truncate">
              <span className="material-symbols-outlined text-[13px]">stadium</span>
              {tournament.venueName}
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0 relative z-10">
        {tournament.entryFee > 0 ? (
          <span className="font-headline-md text-sm text-secondary">€{tournament.entryFee}</span>
        ) : (
          <span className="font-label-caps text-label-caps text-[10px] text-primary">FREE</span>
        )}
        <span className="font-label-caps text-label-caps text-[10px] text-on-surface-variant">
          {spotsLeft > 0 ? `${spotsLeft} spots` : 'Full'}
        </span>
      </div>
    </Link>
  );
}

interface FavoriteVenueHubSectionProps {
  venues: FavoriteVenue[];
  tournaments: TournamentCardData[];
}

export function FavoriteVenueHubSection({ venues, tournaments }: FavoriteVenueHubSectionProps) {
  if (venues.length === 0 && tournaments.length === 0) return null;

  return (
    <section className="space-y-6">
      {venues.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">stadium</span>
              Home Turf
            </h3>
            <Link
              href="/venues"
              className="text-secondary font-label-caps text-label-caps hover:text-secondary-fixed transition-all flex items-center gap-1 group"
            >
              VENUES{' '}
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                chevron_right
              </span>
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
            {venues.map((venue) => (
              <Link
                key={venue.id}
                href={`/venues/${venue.id}`}
                className="glass-card shrink-0 px-4 py-3 rounded-xl border border-secondary/20 hover:border-secondary/45 transition-colors group min-w-[160px]"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-secondary text-[16px]">location_on</span>
                  {venue.verified && (
                    <span className="material-symbols-outlined text-primary text-[14px]">verified</span>
                  )}
                </div>
                <p className="font-headline-md text-[14px] text-on-surface truncate group-hover:text-secondary transition-colors">
                  {venue.name}
                </p>
                <p className="font-body-md text-[11px] text-on-surface-variant mt-0.5">
                  {venue.visits > 0 ? `${venue.visits} visit${venue.visits === 1 ? '' : 's'}` : 'Your pick'}
                  {venue.topSport ? ` · ${venue.topSport}` : ''}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {tournaments.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">emoji_events</span>
                At Your Venues
              </h3>
              <p className="font-body-md text-sm text-on-surface-variant mt-1">Tournaments where you play most</p>
            </div>
            <Link
              href="/tournaments"
              className="text-secondary font-label-caps text-label-caps hover:text-secondary-fixed transition-all flex items-center gap-1 group shrink-0"
            >
              VIEW ALL{' '}
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                chevron_right
              </span>
            </Link>
          </div>
          <div className="space-y-3">
            {tournaments.map((tournament, index) => (
              <TournamentAtVenueItem key={tournament.id} tournament={tournament} index={index} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
