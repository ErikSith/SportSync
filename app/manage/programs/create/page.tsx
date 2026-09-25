import { redirect } from 'next/navigation';
import {
  manageListingCreatePath,
  programKindToListingBucket,
} from '@/lib/manage/listing-bucket';

export const runtime = 'edge';

interface CreateProgramPageProps {
  searchParams: { kind?: string; venueId?: string };
}

/**
 * Legacy /manage/programs/create — redirects to per-hub Rýchle akcie create routes.
 */
export default async function CreateProgramPage({ searchParams }: CreateProgramPageProps) {
  const bucket = programKindToListingBucket(searchParams.kind);
  const base = manageListingCreatePath(bucket);
  const params = new URLSearchParams();
  if (searchParams.venueId) params.set('venueId', searchParams.venueId);
  const qs = params.toString();
  redirect(qs ? `${base}?${qs}` : base);
}
