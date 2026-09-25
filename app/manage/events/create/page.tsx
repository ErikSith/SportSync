import { redirect } from 'next/navigation';
import { getPageViewer } from '@/lib/auth/viewer';
import { SetupNotice } from '@/components/i18n/SetupNotice';
import { canAccessManageHub } from '@/lib/auth/tournament-access';
import { getVenuesForOrganizer } from '@/lib/data/organizer-venues';
import { VenueEventCreator } from '@/components/events/VenueEventCreator';
import { manageListingCreatePath } from '@/lib/manage/listing-bucket';
import { loginHref } from '@/lib/auth/login-href';

export const runtime = 'edge';

interface CreateOfficialEventPageProps {
  searchParams: { venueId?: string; bucket?: string };
}

/** Rýchle akcie → Eventy create (group_class redirects to its own hub route). */
export default async function CreateOfficialEventPage({ searchParams }: CreateOfficialEventPageProps) {
  if (searchParams.bucket === 'group_class') {
    const params = new URLSearchParams();
    if (searchParams.venueId) params.set('venueId', searchParams.venueId);
    const qs = params.toString();
    const base = manageListingCreatePath('group_class');
    redirect(qs ? `${base}?${qs}` : base);
  }

  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return <SetupNotice />;
  }

  if (viewer.isGuest) {
    redirect(loginHref('/manage/events/create', { mode: 'sign-up' }));
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
      listingBucket="event"
    />
  );
}
