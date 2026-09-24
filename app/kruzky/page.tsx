import {
  ProgramsBucketPage,
  type ProgramsBucketSearchParams,
} from '@/app/programs/programs-bucket-page';

export const runtime = 'edge';

interface KruzkyPageProps {
  searchParams: ProgramsBucketSearchParams;
}

export default async function KruzkyPage({ searchParams }: KruzkyPageProps) {
  return (
    <ProgramsBucketPage
      searchParams={searchParams}
      bucket="courses"
      pageKey="kruzky"
      eyebrowKey="kruzky.eyebrow"
      titleKey="kruzky.title"
      subtitleKey="kruzky.subtitle"
    />
  );
}
