'use client';

import type { GearClaimData, GroupDetailData } from '@/lib/data/sport-groups-shared';
import { YourCrewsPage } from '@/components/lobby/groups/YourCrewsPage';

interface CrewHubDetailClientProps {
  group: GroupDetailData;
  viewerId: string;
  viewerName: string;
  viewerAvatarUrl: string | null;
  gearClaims?: GearClaimData[];
}

/** Full-page My Crew hub — matches Your Crews mobile design. */
export function CrewHubDetailClient({
  group,
  viewerId,
  viewerName,
  viewerAvatarUrl,
  gearClaims = [],
}: CrewHubDetailClientProps) {
  return (
    <YourCrewsPage
      group={group}
      viewerId={viewerId}
      viewerName={viewerName}
      viewerAvatarUrl={viewerAvatarUrl}
      gearClaims={gearClaims}
    />
  );
}
