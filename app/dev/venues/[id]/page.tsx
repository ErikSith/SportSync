import { redirect } from 'next/navigation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ borough?: string }>;
};

/** Legacy dossier URL → unified Admin Reviewer. */
export default async function DevVenueDossierRedirect({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const qs = new URLSearchParams();
  qs.set('venue', id);
  qs.set('tab', 'review');
  if (sp.borough?.trim()) qs.set('borough', sp.borough.trim());
  redirect(`/dev/scrape-pages?${qs.toString()}`);
}
