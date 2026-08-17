import type { EventCardData } from '@/lib/data/events';
import { detectExplicitKidsAudience } from '@/lib/events/for-kids';

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

type WomenFields = Pick<EventCardData, 'title' | 'description' | 'sourceUrl'>;
type KidsFields = Pick<
  EventCardData,
  'title' | 'description' | 'sourceUrl' | 'forKids' | 'venueName' | 'sourceName'
>;

function audienceHaystack(event: WomenFields): string {
  return `${event.title} ${event.description ?? ''} ${event.sourceUrl ?? ''}`.toLowerCase();
}

/** Women-only / W4W activities (title + description heuristics). */
export function eventMatchesWomen(event: WomenFields): boolean {
  const hay = audienceHaystack(event);
  return /women\s+for\s+women|\bw4w\b|pre\s+ženy|pre\s+zeny|\bženy\b|\bzeny\b|žensky|zensky|žensk[áaei]|zensk[áaei]|women\s+only|\bwomen\b|\bladies\b|ladies\s+only|dámsky|damsky|female\s+only|len\s+pre\s+ženy|len\s+pre\s+zeny|girl\s+power/i.test(
    hay,
  );
}

/** Kids-oriented activities (DB flag + explicit copy / kids venues). */
export function eventMatchesKids(event: KidsFields): boolean {
  return detectExplicitKidsAudience({
    title: event.title,
    description: event.description,
    sourceUrl: event.sourceUrl,
    venueName: event.venueName,
    sourceName: event.sourceName,
    forKids: event.forKids,
  });
}

export function eventMatchesAudience(event: KidsFields, audience: EventAudience): boolean {
  if (audience === 'all') return true;
  if (audience === 'women') return eventMatchesWomen(event);
  return eventMatchesKids(event);
}

export function applyEventAudienceFilter<T>(
  items: T[],
  audience: EventAudience,
  accessor: (item: T) => KidsFields,
): T[] {
  if (audience === 'all') return items;
  return items.filter((item) => eventMatchesAudience(accessor(item), audience));
}
