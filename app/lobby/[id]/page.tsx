import { notFound } from 'next/navigation';
import { getPageViewer } from '@/lib/auth/viewer';
import { SetupNotice } from '@/components/i18n/SetupNotice';
import { getLobbyById } from '@/lib/data/lobbies';
import { lobbyDetailToPreview } from '@/components/lobby/lobby-preview';
import { LobbyDetailClient } from '@/components/lobby/LobbyDetailClient';

export const runtime = 'edge';

interface LobbyDetailPageProps {
  params: { id: string };
}

export default async function LobbyDetailPage({ params }: LobbyDetailPageProps) {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return <SetupNotice />;
  }

  const { profile } = viewer;
  const lobby = await getLobbyById(params.id, profile.id);
  if (!lobby) notFound();

  return <LobbyDetailClient lobby={lobbyDetailToPreview(lobby)} />;
}
