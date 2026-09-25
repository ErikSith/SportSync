import { redirect } from 'next/navigation';

export const runtime = 'edge';

/** Legacy edit URLs → manage hub (inline roll-down edit). */
export default async function ManageEditListingRedirect({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const { kind, id } = await params;
  if (kind === 'event' || kind === 'tournament') {
    redirect(`/manage?edit=${kind}:${id}`);
  }
  redirect('/manage');
}
