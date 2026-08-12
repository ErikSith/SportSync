import { redirect } from 'next/navigation';
import { getPageViewer } from '@/lib/auth/viewer';
import { getVenuesForOrganizer } from '@/lib/data/organizer-venues';
import { canCreateTournament } from '@/lib/auth/tournament-access';
import { TournamentCreator } from '@/components/tournaments/TournamentCreator';

interface CreateTournamentPageProps {
  searchParams: { venueId?: string };
}

export default async function CreateTournamentPage({ searchParams }: CreateTournamentPageProps) {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return (
      <main className="pt-24 px-container-margin-mobile max-w-lg mx-auto text-center">
        <p className="font-body-md text-body-md text-tertiary-container">Setting up your profile…</p>
      </main>
    );
  }

  if (viewer.isGuest) {
    return (
      <main className="pt-24 px-container-margin-mobile max-w-lg mx-auto text-center">
        <p className="font-body-md text-body-md text-tertiary-container">
          Prihlásenie bude čoskoro — vytváranie zatiaľ nie je dostupné.
        </p>
      </main>
    );
  }

  const { profile } = viewer;

  if (!canCreateTournament(profile.role)) {
    redirect('/tournaments');
  }

  const venues = await getVenuesForOrganizer(profile.id, profile.role);

  return (
    <TournamentCreator
      defaultCity={profile.city}
      organizerName={profile.fullName ?? profile.username}
      role={profile.role}
      venues={venues}
      initialVenueId={searchParams.venueId ?? null}
    />
  );
}
