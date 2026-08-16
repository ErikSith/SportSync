'use client';

import { useRouter } from 'next/navigation';
import type { GroupDetailData } from '@/lib/data/sport-groups-shared';
import { CrewHubModal } from '@/components/lobby/groups/CrewHub';
import { PollRefresh } from '@/lib/realtime/usePollingRefresh';

interface CrewHubDetailClientProps {
  group: GroupDetailData;
  viewerId: string;
  viewerName: string;
  viewerAvatarUrl: string | null;
}

/** Deep-link / share URL — Event & Lobby-style preview window over /lobby. */
export function CrewHubDetailClient({
  group,
  viewerId,
  viewerName,
  viewerAvatarUrl,
}: CrewHubDetailClientProps) {
  const router = useRouter();

  return (
    <>
      <PollRefresh intervalMs={15000} />
      <div className="fixed inset-0 z-40 bg-[#121212]" aria-hidden />
      <CrewHubModal
        group={group}
        viewerId={viewerId}
        viewerName={viewerName}
        viewerAvatarUrl={viewerAvatarUrl}
        open
        onClose={() => {
          router.push('/lobby');
          router.refresh();
        }}
      />
    </>
  );
}
