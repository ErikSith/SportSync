import { getPageViewer } from '@/lib/auth/viewer';
import { SetupNotice } from '@/components/i18n/SetupNotice';
import { JoinGroupClient } from '@/components/lobby/groups/JoinGroupClient';

export const runtime = 'edge';

interface JoinGroupPageProps {
  params: { code: string };
}

export default async function JoinGroupPage({ params }: JoinGroupPageProps) {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return <SetupNotice />;
  }

  const code = params.code.trim().toUpperCase();

  return (
    <>
      <main className="min-h-screen flex items-center justify-center px-container-margin-mobile pb-8 relative overflow-hidden">
        <div className="ambient-glow bg-primary-container/10 w-[400px] h-[400px] top-1/4 left-1/2 -translate-x-1/2" />
        <JoinGroupClient code={code} />
      </main>
    </>
  );
}
