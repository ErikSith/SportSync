'use client';

import dynamic from 'next/dynamic';
import type { VenueCardData } from '@/lib/data/venues';

const VenueDiscoveryMap = dynamic(
  () =>
    import('@/components/venues/VenueDiscoveryMap').then((m) => m.VenueDiscoveryMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(72vh,720px)] min-h-[420px] w-full items-center justify-center rounded-2xl border border-white/10 bg-[#121212]">
        <div className="text-center">
          <span className="material-symbols-outlined mb-2 animate-pulse text-3xl text-[#FF5722]">
            map
          </span>
          <p className="text-sm text-white/55">Loading map…</p>
        </div>
      </div>
    ),
  },
);

export function VenueDiscoveryMapClient({ venues }: { venues: VenueCardData[] }) {
  return <VenueDiscoveryMap venues={venues} />;
}
