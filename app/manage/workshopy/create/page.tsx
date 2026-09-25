import { ManageHubCreatePage } from '@/app/manage/manage-hub-create-page';

export const runtime = 'edge';

interface PageProps {
  searchParams: { venueId?: string };
}

/** Rýchle akcie → Workshopy create. */
export default async function CreateWorkshopyPage({ searchParams }: PageProps) {
  return <ManageHubCreatePage listingBucket="workshops" searchParams={searchParams} />;
}
