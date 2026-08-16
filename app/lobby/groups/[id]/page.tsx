import { notFound } from 'next/navigation';
import { getPageViewer } from '@/lib/auth/viewer';
import { getGroupById } from '@/lib/data/sport-groups';
import type { GroupDetailData } from '@/lib/data/sport-groups-shared';
import { CrewHubDetailClient } from '@/components/lobby/groups/CrewHubDetailClient';

export const runtime = 'edge';

interface GroupDetailPageProps {
  params: { id: string };
}

/** Dates cannot cross the RSC → client boundary. */
function serializeGroupForClient(group: GroupDetailData) {
  return JSON.parse(JSON.stringify(group)) as GroupDetailData;
}

export default async function GroupDetailPage({ params }: GroupDetailPageProps) {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#121212] px-4">
        <p className="text-sm text-gray-400">Setting up your profile…</p>
      </main>
    );
  }

  const { profile } = viewer;
  const group = await getGroupById(params.id, profile.id);
  if (!group) notFound();

  return (
    <CrewHubDetailClient
      group={serializeGroupForClient(group)}
      viewerId={profile.id}
      viewerName={profile.fullName ?? profile.username ?? 'Ty'}
      viewerAvatarUrl={profile.avatarUrl ?? null}
    />
  );
}
