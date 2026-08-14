import { redirect } from 'next/navigation';
import { getPageViewer } from '@/lib/auth/viewer';
import { canAccessManageHub } from '@/lib/auth/tournament-access';
import { getVenuesForOrganizer } from '@/lib/data/organizer-venues';
import { VenueEventCreator } from '@/components/events/VenueEventCreator';

interface CreateOfficialEventPageProps {
  searchParams: { venueId?: string };
}

export default async function CreateOfficialEventPage({ searchParams }: CreateOfficialEventPageProps) {
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

  if (!canAccessManageHub(profile.role)) {
    redirect('/events');
  }

  const venues = await getVenuesForOrganizer(profile.id, profile.role);

  return (
    <VenueEventCreator
      defaultCity={profile.city}
      organizerName={profile.fullName ?? profile.username}
      role={profile.role}
      venues={venues}
      initialVenueId={searchParams.venueId ?? null}
    />
  );
}
