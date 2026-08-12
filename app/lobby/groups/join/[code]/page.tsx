import { getPageViewer } from '@/lib/auth/viewer';
import { JoinGroupClient } from '@/components/lobby/groups/JoinGroupClient';

interface JoinGroupPageProps {
  params: { code: string };
}

export default async function JoinGroupPage({ params }: JoinGroupPageProps) {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return (
      <main className="pt-24 px-container-margin-mobile max-w-lg mx-auto text-center">
        <p className="font-body-md text-body-md text-tertiary-container">Setting up your profile…</p>
      </main>
    );
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
