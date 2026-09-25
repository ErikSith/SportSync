import { ManageHubCreatePage } from '@/app/manage/manage-hub-create-page';

export const runtime = 'edge';

interface PageProps {
  searchParams: { venueId?: string };
}

/** Rýchle akcie → Tábory create. */
export default async function CreateTaboryPage({ searchParams }: PageProps) {
  return <ManageHubCreatePage listingBucket="camps" searchParams={searchParams} />;
}
