import { redirect } from 'next/navigation';
import { getPageViewer } from '@/lib/auth/viewer';
import { SetupNotice } from '@/components/i18n/SetupNotice';
import { getVenuesForOrganizer } from '@/lib/data/organizer-venues';
import { canCreateTournament } from '@/lib/auth/tournament-access';
import { TournamentCreator } from '@/components/tournaments/TournamentCreator';
import { loginHref } from '@/lib/auth/login-href';

export const runtime = 'edge';

interface CreateTournamentPageProps {
  searchParams: { venueId?: string };
}

export default async function CreateTournamentPage({ searchParams }: CreateTournamentPageProps) {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return <SetupNotice />;
  }

  if (viewer.isGuest) {
    redirect(loginHref('/tournaments/create', { mode: 'sign-up' }));
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
