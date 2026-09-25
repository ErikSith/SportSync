import {
  ProgramsBucketPage,
  type ProgramsBucketSearchParams,
} from '@/app/programs/programs-bucket-page';

export const runtime = 'edge';

interface WorkshopyPageProps {
  searchParams: ProgramsBucketSearchParams;
}

/** Workshopy hub — Rýchle akcie (not under a programs umbrella). */
export default async function WorkshopyPage({ searchParams }: WorkshopyPageProps) {
  return (
    <ProgramsBucketPage
      searchParams={searchParams}
      bucket="workshops"
      pageKey="workshopy"
      eyebrowKey="workshopy.eyebrow"
      titleKey="workshopy.title"
      subtitleKey="workshopy.subtitle"
    />
  );
}
