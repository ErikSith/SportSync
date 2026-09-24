import { redirect } from 'next/navigation';
import { getPageViewer } from '@/lib/auth/viewer';
import { SetupNotice } from '@/components/i18n/SetupNotice';
import { canAccessManageHub } from '@/lib/auth/tournament-access';
import { getVenuesForOrganizer } from '@/lib/data/organizer-venues';
import { VenueEventCreator } from '@/components/events/VenueEventCreator';
import { programKindToListingBucket } from '@/lib/manage/listing-bucket';
import { loginHref } from '@/lib/auth/login-href';

export const runtime = 'edge';

interface CreateProgramPageProps {
  searchParams: { kind?: string; venueId?: string };
}

/**
 * Kids camps / workshops / courses — same Event Factory as official events,
 * with listingBucket so theme_config.programKind lands on /programs.
 */
export default async function CreateProgramPage({ searchParams }: CreateProgramPageProps) {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return <SetupNotice />;
  }

  if (viewer.isGuest) {
    redirect(loginHref('/manage/programs/create', { mode: 'sign-up' }));
  }

  if (!canAccessManageHub(viewer.profile.role)) {
    redirect('/');
  }

  const venues = await getVenuesForOrganizer(viewer.profile.id, viewer.profile.role);
  const listingBucket = programKindToListingBucket(searchParams.kind);

  return (
    <VenueEventCreator
      defaultCity={viewer.profile.city}
      organizerName={viewer.profile.fullName ?? viewer.profile.username}
      role={viewer.profile.role}
      venues={venues}
      initialVenueId={searchParams.venueId ?? null}
      listingBucket={listingBucket}
    />
  );
}
