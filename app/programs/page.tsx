import { redirect } from 'next/navigation';
import {
  ProgramsBucketPage,
  type ProgramsBucketSearchParams,
} from '@/app/programs/programs-bucket-page';

export const runtime = 'edge';

interface ProgramsPageProps {
  searchParams: ProgramsBucketSearchParams & { tab?: string };
}

/** Workshopy — camps → /tabory, courses → /kruzky. */
export default async function ProgramsPage({ searchParams }: ProgramsPageProps) {
  if (searchParams.tab === 'camps') {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === 'tab' || value == null || value === '') continue;
      params.set(key, String(value));
    }
    const qs = params.toString();
    redirect(qs ? `/tabory?${qs}` : '/tabory');
  }
  if (searchParams.tab === 'courses') {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === 'tab' || value == null || value === '') continue;
      params.set(key, String(value));
    }
    const qs = params.toString();
    redirect(qs ? `/kruzky?${qs}` : '/kruzky');
  }

  return (
    <ProgramsBucketPage
      searchParams={searchParams}
      bucket="workshops"
      pageKey="programs"
      eyebrowKey="programs.eyebrow"
      titleKey="programs.title"
      subtitleKey="programs.subtitle"
    />
  );
}
