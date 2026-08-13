'use client';

import { useRouter } from 'next/navigation';
import { LobbyPreviewModal } from '@/components/lobby/LobbyPreviewModal';
import type { LobbyPreviewData } from '@/components/lobby/lobby-preview';
import { PollRefresh } from '@/lib/realtime/usePollingRefresh';

interface LobbyDetailClientProps {
  lobby: LobbyPreviewData;
}

/** Deep-link / share URL — same Event/Tournament-style preview window. */
export function LobbyDetailClient({ lobby }: LobbyDetailClientProps) {
  const router = useRouter();

  return (
    <>
      <PollRefresh intervalMs={12000} />
      <div className="fixed inset-0 z-40 bg-[#141210]" aria-hidden />
      <LobbyPreviewModal
        lobby={lobby}
        open
        onClose={() => {
          router.push('/lobby');
          router.refresh();
        }}
      />
    </>
  );
}
