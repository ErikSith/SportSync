import { notFound } from 'next/navigation';
import { getPageViewer } from '@/lib/auth/viewer';
import { getLobbyById } from '@/lib/data/lobbies';
import { lobbyDetailToPreview } from '@/components/lobby/lobby-preview';
import { LobbyDetailClient } from '@/components/lobby/LobbyDetailClient';

interface LobbyDetailPageProps {
  params: { id: string };
}

export default async function LobbyDetailPage({ params }: LobbyDetailPageProps) {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return (
      <main className="mx-auto max-w-lg px-container-margin-mobile pt-24 text-center">
        <p className="font-body-md text-body-md text-tertiary-container">Setting up your profile…</p>
      </main>
    );
  }

  const { profile } = viewer;
  const lobby = await getLobbyById(params.id, profile.id);
  if (!lobby) notFound();

  return <LobbyDetailClient lobby={lobbyDetailToPreview(lobby)} />;
}
