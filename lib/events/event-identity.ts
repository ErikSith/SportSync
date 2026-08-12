import { getZonedParts } from '@/lib/datetime/bratislava';

/** Normalize titles for duplicate detection (accents, case, whitespace). */
export function normalizeEventTitle(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Europe/Bratislava calendar minute — same wall-clock slot = same event time. */
export function eventStartsAtMinuteKey(startsAt: Date | string): string {
  const date = startsAt instanceof Date ? startsAt : new Date(startsAt);
  const p = getZonedParts(date);
  const y = String(p.year);
  const m = String(p.month).padStart(2, '0');
  const d = String(p.day).padStart(2, '0');
  const hh = String(p.hour).padStart(2, '0');
  const mm = String(p.minute).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

/** Duplicate key: normalized name + local date + time (minute). */
export function eventIdentityKey(title: string, startsAt: Date | string): string {
  return `${normalizeEventTitle(title)}|${eventStartsAtMinuteKey(startsAt)}`;
}

export interface IdentityDedupeable {
  id: string;
  title: string;
  startsAt: Date | string;
  registeredCount?: number;
  venueId?: string | null;
  venueName?: string | null;
  sourceUrl?: string | null;
  ticketUrl?: string | null;
  isAggregated?: boolean;
  coverUrl?: string | null;
}

/** Prefer the richer / more bookable row when collapsing duplicates. */
export function preferIdentityEvent<T extends IdentityDedupeable>(a: T, b: T): T {
  const score = (e: IdentityDedupeable) =>
    (e.registeredCount ?? 0) * 100 +
    (e.venueId || e.venueName ? 20 : 0) +
    (e.sourceUrl || e.ticketUrl ? 10 : 0) +
    (e.coverUrl ? 5 : 0) +
    (e.isAggregated ? 0 : 2);

  const sa = score(a);
  const sb = score(b);
  if (sb !== sa) return sb > sa ? b : a;
  return a.id <= b.id ? a : b;
}

/**
 * Collapse events that share the same title + local date/time.
 * Order of first occurrence is preserved among unique keys.
 */
export function dedupeEventsByIdentity<T extends IdentityDedupeable>(events: T[]): T[] {
  const byKey = new Map<string, T>();
  const order: string[] = [];

  for (const event of events) {
    const key = eventIdentityKey(event.title, event.startsAt);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, event);
      order.push(key);
      continue;
    }
    byKey.set(key, preferIdentityEvent(prev, event));
  }

  return order.map((key) => byKey.get(key)!);
}
