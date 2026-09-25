import { redirect } from 'next/navigation';
import type { ProgramsBucketSearchParams } from '@/app/programs/programs-bucket-page';

export const runtime = 'edge';

interface ProgramsPageProps {
  searchParams: ProgramsBucketSearchParams & { tab?: string };
}

function qsWithoutTab(searchParams: ProgramsPageProps['searchParams']): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === 'tab' || value == null || value === '') continue;
    params.set(key, String(value));
  }
  return params.toString();
}

/**
 * Legacy /programs — workshops live at /workshopy.
 * Old ?tab=camps|courses still redirect to /tabory|/kruzky.
 */
export default async function ProgramsPage({ searchParams }: ProgramsPageProps) {
  if (searchParams.tab === 'camps') {
    const qs = qsWithoutTab(searchParams);
    redirect(qs ? `/tabory?${qs}` : '/tabory');
  }
  if (searchParams.tab === 'courses') {
    const qs = qsWithoutTab(searchParams);
    redirect(qs ? `/kruzky?${qs}` : '/kruzky');
  }

  const qs = qsWithoutTab(searchParams);
  redirect(qs ? `/workshopy?${qs}` : '/workshopy');
}
