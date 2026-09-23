'use client';

import dynamic from 'next/dynamic';
import type { MeetingPointMapProps } from '@/components/lobby/MeetingPointMap';

const MeetingPointMap = dynamic(
  () => import('@/components/lobby/MeetingPointMap').then((m) => m.MeetingPointMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[200px] w-full items-center justify-center rounded-xl border border-white/10 bg-[#121212]">
        <p className="text-[11px] text-zinc-500">Načítavam mapu…</p>
      </div>
    ),
  },
);

export function MeetingPointMapClient(props: MeetingPointMapProps) {
  return <MeetingPointMap {...props} />;
}
