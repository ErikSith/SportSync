import { ManageHubCreatePage } from '@/app/manage/manage-hub-create-page';

export const runtime = 'edge';

interface PageProps {
  searchParams: { venueId?: string };
}

/** Rýchle akcie → Skupinové cvičenia create. */
export default async function CreateSkupinoveCviceniaPage({ searchParams }: PageProps) {
  return <ManageHubCreatePage listingBucket="group_class" searchParams={searchParams} />;
}
