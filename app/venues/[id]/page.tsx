import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPageViewer } from '@/lib/auth/viewer';
import { getVenueById } from '@/lib/data/venues';
import { canAccessManageHub } from '@/lib/auth/tournament-access';
import { resolveVenueCover, resolveVenueLogo } from '@/lib/venues/venue-media';
import { sportDisplayLabel } from '@/lib/constants/sports';

export const runtime = 'edge';

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface VenueDetailPageProps {
  params: { id: string };
}

export default async function VenueDetailPage({ params }: VenueDetailPageProps) {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return (
      <main className="pt-24 px-container-margin-mobile max-w-lg mx-auto text-center">
        <p className="font-body-md text-body-md text-tertiary-container">Setting up your profile…</p>
      </main>
    );
  }

  const { profile } = viewer;

  const venue = await getVenueById(params.id);
  if (!venue) notFound();

  const canManageVenue =
    canAccessManageHub(profile.role) &&
    (profile.role === 'ADMIN' || venue.ownerId === profile.id);

  const hero = resolveVenueCover({
    name: venue.name,
    sports: venue.sports,
    coverUrl: venue.coverUrl,
  });
  const logo = resolveVenueLogo({
    name: venue.name,
    logoUrl: venue.logoUrl,
    websiteUrl: venue.websiteUrl,
  });

  return (
    <>
      <div className="md:hidden fixed top-0 w-full z-50 flex items-center justify-between px-4 h-16 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <Link
          href="/venues"
          className="w-10 h-10 rounded-full bg-surface-container-high/50 backdrop-blur-md flex items-center justify-center border border-white/10 pointer-events-auto"
          aria-label="Back to venues"
        >
          <span className="material-symbols-outlined text-on-surface">arrow_back</span>
        </Link>
      </div>

      <header className="hidden md:flex bg-background/80 backdrop-blur-xl fixed top-0 w-full z-50 border-b border-white/10 shadow-2xl shadow-black/40">
        <div className="flex justify-between items-center px-container-margin-desktop h-16 w-full max-w-[1440px] mx-auto">
          <Link href="/venues" className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="font-label-caps text-label-caps">Back to Venues</span>
          </Link>
          <Link href="/" className="font-display-lg-mobile text-display-lg-mobile font-bold tracking-tighter gradient-text">
            SPORTSYNC
          </Link>
          <div className="w-24" />
        </div>
      </header>

      <main className="w-full max-w-[1440px] mx-auto md:pt-16 pb-8">
        <section className="relative w-full h-[442px] md:h-[530px] lg:h-[618px] flex items-end pb-8 px-4 md:px-gutter">
          <div className="absolute inset-0 z-0">
            <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url('${hero}')` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          </div>

          <div className="relative z-10 w-full max-w-4xl">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {logo && (
                <span className="w-10 h-10 rounded-full bg-background/80 border border-white/15 overflow-hidden flex items-center justify-center backdrop-blur-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logo} alt="" className="w-7 h-7 object-contain" />
                </span>
              )}
              {venue.verified && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-tertiary-container/30 border border-tertiary/30 font-label-caps text-[10px] text-tertiary uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    verified
                  </span>
                  Elite Verified
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-surface-container/50 border border-white/10 font-label-caps text-[10px] text-on-surface uppercase tracking-wider">
                <span className="material-symbols-outlined text-[14px]">location_on</span>
                {venue.city}
              </span>
              {venue.sports.slice(0, 3).map((sport) => (
                <span
                  key={sport}
                  className="inline-flex px-2 py-1 rounded-full bg-surface-container/50 border border-white/10 font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider"
                >
                  {sportDisplayLabel(sport)}
                </span>
              ))}
            </div>

            <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-white mb-2 tracking-tight">
              {venue.name}
            </h1>

            {venue.address && (
              <p className="font-body-lg text-body-lg text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">map</span>
                {venue.address}
              </p>
            )}
          </div>
        </section>

        <div className="px-4 md:px-container-margin-desktop py-8 md:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-12 md:space-y-section-gap">
            {venue.description && (
              <section>
                <h2 className="font-headline-md text-headline-md text-white mb-4">About the Venue</h2>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{venue.description}</p>
              </section>
            )}

            {venue.sports.length > 0 && (
              <section>
                <h2 className="font-headline-md text-headline-md text-white mb-4">Sports Offered</h2>
                <div className="flex flex-wrap gap-3">
                  {venue.sports.map((sport) => (
                    <span
                      key={sport}
                      className="bg-secondary/10 text-secondary font-label-caps text-label-caps px-4 py-2 rounded-full border border-secondary/30"
                    >
                      {sport}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {venue.amenities.length > 0 && (
              <section>
                <h2 className="font-headline-md text-headline-md text-white mb-6">Facilities &amp; Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {venue.amenities.map((amenity) => (
                    <div
                      key={amenity.key}
                      className="glass-card rounded-xl p-4 flex flex-col items-center justify-center text-center gap-3"
                    >
                      <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center border border-white/5">
                        <span className="material-symbols-outlined text-primary text-2xl">{amenity.icon}</span>
                      </div>
                      <span className="font-body-md text-[14px] text-on-surface font-semibold">{amenity.label}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {venue.upcomingEvents.length > 0 && (
              <section>
                <h2 className="font-headline-md text-headline-md text-white mb-4">Upcoming Events</h2>
                <div className="space-y-3">
                  {venue.upcomingEvents.map((event) => (
                    <Link
                      key={event.id}
                      href="/events"
                      className="glass-card rounded-xl p-4 flex items-center justify-between gap-4 hover:border-primary/30 transition-colors"
                    >
                      <div>
                        <p className="font-headline-md text-[18px] text-white">{event.title}</p>
                        <p className="font-body-md text-sm text-on-surface-variant mt-1">
                          {event.sport} • {formatDateTime(event.startsAt)}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-primary">chevron_right</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {venue.upcomingTournaments.length > 0 && (
              <section>
                <h2 className="font-headline-md text-headline-md text-white mb-4">Upcoming Tournaments</h2>
                <div className="space-y-3">
                  {venue.upcomingTournaments.map((tournament) => (
                    <Link
                      key={tournament.id}
                      href="/tournaments"
                      className="glass-card rounded-xl p-4 flex items-center justify-between gap-4 hover:border-secondary/30 transition-colors"
                    >
                      <div>
                        <p className="font-headline-md text-[18px] text-white">{tournament.name}</p>
                        <p className="font-body-md text-sm text-on-surface-variant mt-1">
                          {tournament.sport} • {formatDateTime(tournament.startsAt)}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-secondary">chevron_right</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {venue.upcomingLobbies.length > 0 && (
              <section>
                <h2 className="font-headline-md text-headline-md text-white mb-4">Upcoming Lobbies</h2>
                <div className="space-y-3">
                  {venue.upcomingLobbies.map((lobby) => (
                    <Link
                      key={lobby.id}
                      href={`/lobby/${lobby.id}`}
                      className="glass-card rounded-xl p-4 flex items-center justify-between gap-4 hover:border-primary/30 transition-colors"
                    >
                      <div>
                        <p className="font-headline-md text-[18px] text-white">
                          {lobby.sport} • {lobby.format}
                        </p>
                        <p className="font-body-md text-sm text-on-surface-variant mt-1">
                          {formatDateTime(lobby.scheduledAt)} • {lobby.spotsFilled}/{lobby.spotsTotal} spots
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-primary">chevron_right</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              {canManageVenue && (
                <div className="glass-card rounded-xl p-6 border border-secondary/25 space-y-3">
                  <h3 className="font-headline-md text-[20px] text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary">edit_square</span>
                    Manage this venue
                  </h3>
                  <Link
                    href={`/manage/events/create?venueId=${venue.id}`}
                    className="w-full py-3 rounded-lg bg-secondary text-on-secondary font-label-caps text-label-caps flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">event</span>
                    Create event here
                  </Link>
                  <Link
                    href={`/tournaments/create?venueId=${venue.id}`}
                    className="w-full py-3 rounded-lg border border-secondary/40 text-secondary font-label-caps text-label-caps flex items-center justify-center gap-2 hover:bg-secondary/10 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">emoji_events</span>
                    Create tournament here
                  </Link>
                </div>
              )}

              {venue.openingHours.length > 0 && (
                <div className="glass-card rounded-xl p-6">
                  <h3 className="font-headline-md text-[20px] text-white mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">schedule</span>
                    Hours of Operation
                  </h3>
                  <ul className="space-y-3 font-body-md text-sm text-on-surface-variant">
                    {venue.openingHours.map((entry, index) => (
                      <li
                        key={entry.label}
                        className={`flex justify-between items-center ${index < venue.openingHours.length - 1 ? 'border-b border-white/5 pb-2' : 'pt-1'}`}
                      >
                        <span>{entry.label}</span>
                        <span className="text-white font-semibold">{entry.hours}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="glass-card rounded-xl p-6">
                <h3 className="font-headline-md text-[20px] text-white mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">location_on</span>
                  Location
                </h3>
                <p className="font-body-md text-sm text-on-surface-variant">
                  {venue.address ? `${venue.address}, ${venue.city}` : venue.city}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

    </>
  );
}
