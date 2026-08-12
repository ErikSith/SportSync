'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Polls for updates on multi-user surfaces where Supabase Realtime is not yet wired.
 * Calls router.refresh() on an interval while the component is mounted.
 */
export function usePollingRefresh(intervalMs = 15000, enabled = true): void {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      routerRef.current.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}

/** Invisible component that enables polling refresh for its subtree's server data. */
export function PollRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  usePollingRefresh(intervalMs);
  return null;
}
