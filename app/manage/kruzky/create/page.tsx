import { ManageHubCreatePage } from '@/app/manage/manage-hub-create-page';

export const runtime = 'edge';

interface PageProps {
  searchParams: { venueId?: string };
}

/** Rýchle akcie → Krúžky create. */
export default async function CreateKruzkyPage({ searchParams }: PageProps) {
  return <ManageHubCreatePage listingBucket="courses" searchParams={searchParams} />;
}
