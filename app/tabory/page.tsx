import {
  ProgramsBucketPage,
  type ProgramsBucketSearchParams,
} from '@/app/programs/programs-bucket-page';

export const runtime = 'edge';

interface TaboryPageProps {
  searchParams: ProgramsBucketSearchParams;
}

export default async function TaboryPage({ searchParams }: TaboryPageProps) {
  return (
    <ProgramsBucketPage
      searchParams={searchParams}
      bucket="camps"
      pageKey="tabory"
      eyebrowKey="tabory.eyebrow"
      titleKey="tabory.title"
      subtitleKey="tabory.subtitle"
    />
  );
}
