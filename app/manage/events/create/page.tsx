import { redirect } from 'next/navigation';
import { getPageViewer } from '@/lib/auth/viewer';
import { SetupNotice } from '@/components/i18n/SetupNotice';
import { canAccessManageHub } from '@/lib/auth/tournament-access';
import { getVenuesForOrganizer } from '@/lib/data/organizer-venues';
import { VenueEventCreator } from '@/components/events/VenueEventCreator';
import { parseManageListingBucket } from '@/lib/manage/listing-bucket';

export const runtime = 'edge';

interface CreateOfficialEventPageProps {
  searchParams: { venueId?: string; bucket?: string };
}

export default async function CreateOfficialEventPage({ searchParams }: CreateOfficialEventPageProps) {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return <SetupNotice />;
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
  // Programs use /manage/programs/create — this route is event or group_class only.
  const rawBucket = searchParams.bucket;
  const listingBucket =
    rawBucket === 'group_class' ? 'group_class' : parseManageListingBucket(rawBucket);
  const safeBucket =
    listingBucket === 'camps' ||
    listingBucket === 'workshops' ||
    listingBucket === 'courses'
      ? 'event'
      : listingBucket;

  return (
    <VenueEventCreator
      defaultCity={profile.city}
      organizerName={profile.fullName ?? profile.username}
      role={profile.role}
      venues={venues}
      initialVenueId={searchParams.venueId ?? null}
      listingBucket={safeBucket}
    />
  );
}
