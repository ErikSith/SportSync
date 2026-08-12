/**
 * Platform signal capture — feeds the Main Brain's demand/perception layer.
 * Client-side: fire-and-forget POST. Server-side: direct insert.
 */

export type SignalName =
  | 'page.view'
  | 'search.query'
  | 'filter.apply'
  | 'geo.fallback'
  | 'event.register'
  | 'event.external_redirect'
  | 'event.report'
  | 'event.create'
  | 'lobby.join'
  | 'lobby.leave'
  | 'tournament.register'
  | 'tournament.external_redirect'
  | 'tournament.fill_alert'
  | 'lesson.book'
  | 'group.rsvp'
  | 'group.mercenary_sos'
  | 'ai.parse'
  | 'ai.plan_executed';

export interface SignalPayload {
  [key: string]: string | number | boolean | null | undefined;
}

/** Client-side signal — non-blocking, swallows errors. */
export function trackSignal(eventName: SignalName, payload: SignalPayload = {}): void {
  if (typeof window === 'undefined') return;
  void fetch('/api/telemetry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventName, payload, ts: Date.now() }),
  }).catch(() => {});
}
