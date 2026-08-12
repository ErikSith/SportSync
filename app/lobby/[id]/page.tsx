import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPageViewer } from '@/lib/auth/viewer';
import { getLobbyById } from '@/lib/data/lobbies';
import { formatLobbyLabel } from '@/lib/constants/lobbies';
import { lobbyTierLabel } from '@/lib/utils/lobby';
import { LobbyRoster } from '@/components/lobby/LobbyRoster';
import { RecordMatchResultForm } from '@/components/shared/RecordMatchResultForm';
import { PollRefresh } from '@/lib/realtime/usePollingRefresh';
import { LobbyActions } from '@/components/lobby/LobbyActions';
import { VenueEventBookingLinks } from '@/components/shared/VenueEventBookingLinks';

const SPORT_ICONS: Record<string, string> = {
  TENNIS: 'sports_tennis',
  PADEL: 'sports_tennis',
  SQUASH: 'sports_martial_arts',
  RUNNING: 'run_circle',
  FOOTBALL: 'sports_soccer',
  BASKETBALL: 'sports_basketball',
};

function formatSchedule(date: Date): string {
  const now = new Date();
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  if (date.toDateString() === now.toDateString()) {
    return `Today, ${time}`;
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow, ${time}`;
  }

  const day = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${day}, ${time}`;
}

function rosterStatusLabel(spotsFilled: number, spotsTotal: number): string {
  const needed = spotsTotal - spotsFilled;
  if (needed <= 0) return 'Roster complete';
  if (needed === 1) return 'Looking for 1 more player';
  return `Looking for ${needed} more players`;
}

function statusBadge(status: string, spotsFilled: number, spotsTotal: number): { label: string; live: boolean } {
  if (status === 'full' || spotsFilled >= spotsTotal) {
    return { label: 'Full', live: false };
  }
  if (spotsFilled === spotsTotal - 1 || status === 'live') {
    return { label: 'Live', live: true };
  }
  return { label: 'Open', live: true };
}

interface LobbyDetailPageProps {
  params: { id: string };
}

export default async function LobbyDetailPage({ params }: LobbyDetailPageProps) {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return (
      <main className="pt-24 px-container-margin-mobile max-w-lg mx-auto text-center">
        <p className="font-body-md text-body-md text-tertiary-container">Setting up your profile…</p>
      </main>
    );
  }

  const { profile } = viewer;

  const lobby = await getLobbyById(params.id, profile.id);
  if (!lobby) notFound();

  const tier = lobbyTierLabel(lobby.skillLevel);
  const icon = SPORT_ICONS[lobby.sport.toUpperCase()] ?? 'sports';
  const badge = statusBadge(lobby.status, lobby.spotsFilled, lobby.spotsTotal);
  const progressPct = Math.min(100, Math.round((lobby.spotsFilled / lobby.spotsTotal) * 100));
  const locationLine = lobby.venue?.name ?? lobby.city;
  const cityLine = lobby.venue ? `${lobby.venue.city}${lobby.venue.address ? ` • ${lobby.venue.address}` : ''}` : lobby.city;

  return (
    <>
      <header className="fixed top-0 w-full bg-background/90 backdrop-blur-xl border-b border-white/5 z-50 shadow-2xl shadow-black/40 px-container-margin-mobile md:px-container-margin-desktop h-16 flex items-center justify-between">
        <Link href="/lobby" className="text-on-surface-variant hover:text-primary transition-colors flex items-center group">
          <span className="material-symbols-outlined mr-2 group-hover:-translate-x-1 transition-transform">arrow_back</span>
          <span className="font-label-caps text-label-caps uppercase hidden md:inline">Back</span>
        </Link>
        <h1 className="font-headline-md text-headline-md text-on-surface font-bold">Lobby Details</h1>
        <div className="w-10" />
      </header>

      <main className="pt-24 pb-32 px-container-margin-mobile md:px-container-margin-desktop max-w-7xl mx-auto min-h-screen relative">
        <div className="ambient-glow bg-primary-container/5 w-[600px] h-[600px] top-0 left-1/2 -translate-x-1/2 pointer-events-none" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter relative z-10">
          <div className="lg:col-span-8 flex flex-col gap-gutter">
            <section className="glass-panel rounded-xl p-6 md:p-10 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low to-transparent" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <span className="px-3 py-1 bg-primary-container/20 text-primary-container border border-primary-container/30 rounded-full font-label-caps text-label-caps uppercase tracking-wider backdrop-blur-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">{icon}</span>
                    {lobby.sport}
                  </span>
                  {badge.live && (
                    <span className="px-3 py-1 bg-secondary-container/20 text-secondary border border-secondary/30 rounded-full font-label-caps text-label-caps uppercase tracking-wider backdrop-blur-sm flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                      {badge.label}
                    </span>
                  )}
                  {!badge.live && (
                    <span className="px-3 py-1 bg-surface-container-high text-on-surface-variant border border-white/10 rounded-full font-label-caps text-label-caps uppercase tracking-wider">
                      {badge.label}
                    </span>
                  )}
                  <span className="px-3 py-1 bg-secondary-container/10 text-secondary border border-secondary/20 rounded-full font-label-caps text-[10px] uppercase tracking-wider">
                    {tier}
                  </span>
                </div>
                <h2 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg mb-2 text-on-surface">
                  {formatLobbyLabel(lobby.format)}
                  <br />
                  <span className="text-on-surface-variant">{locationLine}</span>
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mt-4">
                  {lobby.mercenaryMode
                    ? 'Mercenary mode enabled — nearby players can jump in as an emergency +1.'
                    : `${formatLobbyLabel(lobby.format)} session hosted by ${lobby.host.name} in ${lobby.city}.`}
                </p>
              </div>
            </section>

            <section className="glass-panel rounded-xl p-6">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface mb-1">Roster Status</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">{rosterStatusLabel(lobby.spotsFilled, lobby.spotsTotal)}</p>
                </div>
                <div className="text-right">
                  <span className="font-display-lg-mobile text-display-lg-mobile text-primary-container">{lobby.spotsFilled}</span>
                  <span className="font-headline-md text-headline-md text-on-surface-variant">/{lobby.spotsTotal}</span>
                </div>
              </div>
              <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden mt-4 relative">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-container to-secondary-container rounded-full shadow-[0_0_15px_rgba(255,87,34,0.5)] transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-panel rounded-xl p-5 flex flex-col justify-center items-start">
                <span className="material-symbols-outlined text-primary mb-3">calendar_month</span>
                <p className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-1">Schedule</p>
                <p className="font-body-lg text-body-lg text-on-surface font-semibold">{formatSchedule(lobby.scheduledAt)}</p>
              </div>

              <div className="glass-panel rounded-xl p-5 flex flex-col justify-center items-start relative overflow-hidden">
                <div className="absolute right-[-20%] bottom-[-20%] w-32 h-32 opacity-10">
                  <span className="material-symbols-outlined text-9xl text-white">location_on</span>
                </div>
                <span className="material-symbols-outlined text-primary mb-3 relative z-10">location_on</span>
                <p className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-1 relative z-10">Location</p>
                <p className="font-body-lg text-body-lg text-on-surface font-semibold relative z-10 truncate w-full">{locationLine}</p>
                <p className="font-body-md text-body-md text-on-surface-variant text-sm relative z-10">{cityLine}</p>
              </div>

              <div className="glass-panel rounded-xl p-5 flex flex-col justify-center items-start border border-secondary/20 bg-gradient-to-br from-surface-container-low to-secondary-container/5 gap-3">
                <span className="material-symbols-outlined text-secondary">storefront</span>
                <p className="font-label-caps text-label-caps text-secondary uppercase mb-1">Booking</p>
                <p className="font-body-md text-body-md text-on-surface-variant text-sm">
                  Courts, tickets, and gear are purchased at the venue or event page.
                </p>
                {lobby.venue ? (
                  <VenueEventBookingLinks venueId={lobby.venue.id} venueName={lobby.venue.name} compact />
                ) : (
                  <Link href="/venues" className="font-label-caps text-label-caps text-secondary hover:text-primary transition-colors">
                    Browse venues
                  </Link>
                )}
              </div>
            </section>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-gutter">
            <PollRefresh intervalMs={12000} />
            <LobbyRoster lobby={lobby} />
            {lobby.isHost && lobby.participants.length >= 2 && (
              <RecordMatchResultForm
                sport={lobby.sport}
                contextType="lobby"
                contextId={lobby.id}
                participants={lobby.participants.map((p) => ({ id: p.id, name: p.name }))}
              />
            )}
          </div>
        </div>
      </main>

      <LobbyActions
        lobbyId={lobby.id}
        isHost={lobby.isHost}
        isJoined={lobby.isJoined}
        mercenaryMode={lobby.mercenaryMode}
        status={lobby.status}
        spotsFilled={lobby.spotsFilled}
        spotsTotal={lobby.spotsTotal}
        venueId={lobby.venue?.id}
        venueName={lobby.venue?.name}
      />

    </>
  );
}
