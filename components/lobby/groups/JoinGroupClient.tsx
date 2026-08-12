'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface JoinGroupClientProps {
  code: string;
}

type JoinState = 'joining' | 'success' | 'error';

export function JoinGroupClient({ code }: JoinGroupClientProps) {
  const router = useRouter();
  const [state, setState] = useState<JoinState>('joining');
  const [error, setError] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function join() {
      const res = await fetch(`/api/groups/join/${code}`, { method: 'POST' });
      const body = (await res.json().catch(() => null)) as {
        error?: string;
        groupId?: string;
        groupName?: string;
        alreadyMember?: boolean;
      } | null;

      if (cancelled) return;

      if (!res.ok) {
        setState('error');
        setError(body?.error ?? 'Could not join crew');
        return;
      }

      setGroupName(body?.groupName ?? null);
      setState('success');

      if (body?.groupId) {
        router.replace(`/lobby/groups/${body.groupId}`);
      }
    }

    void join();

    return () => {
      cancelled = true;
    };
  }, [code, router]);

  if (state === 'joining') {
    return (
      <section className="glass-panel rounded-2xl p-8 w-full max-w-md text-center space-y-4 border border-secondary/10">
        <span className="material-symbols-outlined text-primary-container text-[48px] animate-spin">progress_activity</span>
        <h1 className="font-headline-md text-headline-md text-on-surface">Joining crew…</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">Hang tight while we add you to the group.</p>
      </section>
    );
  }

  if (state === 'error') {
    return (
      <section className="glass-panel rounded-2xl p-8 w-full max-w-md text-center space-y-6 border border-secondary/10">
        <div className="w-16 h-16 mx-auto rounded-full bg-error-container/20 flex items-center justify-center border border-error/40">
          <span className="material-symbols-outlined text-error text-[32px]">error</span>
        </div>
        <div className="space-y-2">
          <h1 className="font-headline-md text-headline-md text-on-surface">Could not join</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">{error}</p>
        </div>
        <Link
          href="/lobby"
          className="inline-flex w-full py-3 rounded-lg border border-secondary text-secondary font-label-caps text-label-caps hover:bg-secondary/10 transition-colors items-center justify-center gap-2"
        >
          BACK TO LOBBY
        </Link>
      </section>
    );
  }

  return (
    <section className="glass-panel rounded-2xl p-8 w-full max-w-md text-center space-y-4 border border-secondary/10">
      <div className="w-16 h-16 mx-auto rounded-full bg-primary-container/20 flex items-center justify-center border border-primary-container/40">
        <span className="material-symbols-outlined text-primary-container text-[32px]">check_circle</span>
      </div>
      <h1 className="font-headline-md text-headline-md text-on-surface">
        {groupName ? `Welcome to ${groupName}!` : 'You joined the crew!'}
      </h1>
      <p className="font-body-md text-body-md text-on-surface-variant">Redirecting to your crew hub…</p>
    </section>
  );
}
