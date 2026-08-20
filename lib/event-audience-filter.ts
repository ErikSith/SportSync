import type { EventCardData } from '@/lib/data/events';
import { classifyListingAudience } from '@/lib/events/audience';

export type EventAudience = 'all' | 'women' | 'kids';

export const EVENT_AUDIENCE_OPTIONS: Array<{ key: EventAudience; label: string }> = [
  { key: 'all', label: 'Všetci' },
  { key: 'women', label: 'Pre ženy' },
  { key: 'kids', label: 'Pre deti' },
];

export function parseEventAudience(raw: string | undefined | null): EventAudience {
  if (raw === 'women' || raw === 'kids') return raw;
  return 'all';
}

export function eventAudienceLabel(audience: EventAudience): string {
  return EVENT_AUDIENCE_OPTIONS.find((o) => o.key === audience)?.label ?? 'Všetci';
}

export type AudienceFields = Pick<
  EventCardData,
  'title' | 'description' | 'sourceUrl' | 'forKids' | 'venueName' | 'sourceName'
> & {
  forWomen?: boolean | null;
};

function classify(event: AudienceFields) {
  return classifyListingAudience({
    title: event.title,
    description: event.description,
    sourceUrl: event.sourceUrl,
    venueName: event.venueName,
    sourceName: event.sourceName,
    forKids: event.forKids,
    forWomen: event.forWomen,
  });
}

/** Women-only / W4W activities (persisted flag + title/description heuristics). */
export function eventMatchesWomen(event: AudienceFields): boolean {
  return classify(event).forWomen;
}

/** Kids-oriented activities (DB flag + explicit copy / kids venues). */
export function eventMatchesKids(event: AudienceFields): boolean {
  return classify(event).forKids;
}

/**
 * `all` = open mixed listings (not exclusively kids, not exclusively women).
 * Dedicated filters still surface those exclusive activities.
 */
export function eventMatchesAudience(event: AudienceFields, audience: EventAudience): boolean {
  const { forKids, forWomen } = classify(event);
  if (audience === 'women') return forWomen;
  if (audience === 'kids') return forKids;
  return !forKids && !forWomen;
}

export function applyEventAudienceFilter<T>(
  items: T[],
  audience: EventAudience,
  accessor: (item: T) => AudienceFields,
): T[] {
  return items.filter((item) => eventMatchesAudience(accessor(item), audience));
}
