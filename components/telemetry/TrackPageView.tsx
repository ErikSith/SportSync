'use client';

import { useEffect } from 'react';
import { trackSignal, type SignalName, type SignalPayload } from '@/lib/telemetry/track';

/** Fires a page.view signal once on mount. */
export function TrackPageView({ page, extra }: { page: string; extra?: SignalPayload }) {
  useEffect(() => {
    trackSignal('page.view', { page, ...extra });
  }, [page, extra]);
  return null;
}

/** Wrapper that re-fires a signal when props change (filters, search). */
export function TrackSignal({
  eventName,
  payload,
}: {
  eventName: SignalName;
  payload: SignalPayload;
}) {
  useEffect(() => {
    trackSignal(eventName, payload);
  }, [eventName, payload]);
  return null;
}
