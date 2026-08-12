'use client';

import { useEffect } from 'react';
import { trackSignal } from '@/lib/telemetry/track';

/** Emits a geo.fallback signal when the feed extended the search radius. */
export function GeoFallbackTracker({ showExtended, radiusKm }: { showExtended: boolean; radiusKm: number }) {
  useEffect(() => {
    if (showExtended) {
      trackSignal('geo.fallback', { radiusKm, extended: true });
    }
  }, [showExtended, radiusKm]);
  return null;
}
