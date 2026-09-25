import { redirect } from 'next/navigation';
import { getPageViewer } from '@/lib/auth/viewer';
import { SetupNotice } from '@/components/i18n/SetupNotice';
import { canAccessManageHub } from '@/lib/auth/tournament-access';
import { getVenuesForOrganizer } from '@/lib/data/organizer-venues';
import { VenueEventCreator } from '@/components/events/VenueEventCreator';
import {
  manageListingCreatePath,
  type ManageListingBucket,
} from '@/lib/manage/listing-bucket';
import { loginHref } from '@/lib/auth/login-href';

export const runtime = 'edge';

/**
 * Shared Rýchla akcia create page (Event Factory) for a fixed listing bucket.
 */
export async function ManageHubCreatePage(props: {
  listingBucket: ManageListingBucket;
  searchParams: { venueId?: string };
}) {
  const { listingBucket, searchParams } = props;
  const createPath = manageListingCreatePath(listingBucket);

  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return <SetupNotice />;
  }

  if (viewer.isGuest) {
    redirect(loginHref(createPath, { mode: 'sign-up' }));
  }

  if (!canAccessManageHub(viewer.profile.role)) {
    redirect('/');
  }

  const venues = await getVenuesForOrganizer(viewer.profile.id, viewer.profile.role);

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
