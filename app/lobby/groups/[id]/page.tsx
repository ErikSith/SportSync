import { notFound } from 'next/navigation';
import { getPageViewer } from '@/lib/auth/viewer';
import { SetupNotice } from '@/components/i18n/SetupNotice';
import { getGroupById, getSessionById } from '@/lib/data/sport-groups';
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

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export default async function GroupDetailPage({ params }: GroupDetailPageProps) {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return <SetupNotice />;
  }

  const { profile } = viewer;
  const group = await getGroupById(params.id, profile.id);
  if (!group) notFound();

  const now = Date.now();
  const nextActivity = group.activities
    .filter((a) => a.isPinned || asDate(a.scheduledAt).getTime() >= now)
    .sort((a, b) => asDate(a.scheduledAt).getTime() - asDate(b.scheduledAt).getTime())[0];

  const session = nextActivity
    ? await getSessionById(group.id, nextActivity.id, profile.id)
    : null;

  return (
    <CrewHubDetailClient
      group={serializeGroupForClient(group)}
      viewerId={profile.id}
      viewerName={profile.fullName ?? profile.username ?? 'Ty'}
      viewerAvatarUrl={profile.avatarUrl ?? null}
      gearClaims={session?.gearClaims ?? []}
    />
  );
}
