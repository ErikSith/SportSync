import type { EventCardData } from '@/lib/data/events';

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

function audienceHaystack(event: Pick<EventCardData, 'title' | 'description' | 'sourceUrl'>): string {
  return `${event.title} ${event.description ?? ''} ${event.sourceUrl ?? ''}`.toLowerCase();
}

/** Women-only / W4W activities (title + description heuristics). */
export function eventMatchesWomen(
  event: Pick<EventCardData, 'title' | 'description' | 'sourceUrl'>,
): boolean {
  const hay = audienceHaystack(event);
  return /women\s+for\s+women|\bw4w\b|pre\s+ženy|pre\s+zeny|žensky|zensky|žensk[áaei]|zensk[áaei]|women\s+only|ladies\s+only|dámsky|damsky|female\s+only|len\s+pre\s+ženy|len\s+pre\s+zeny|girl\s+power/i.test(
    hay,
  );
}

/** Kids-oriented activities (DB flag + scraped copy). */
export function eventMatchesKids(
  event: Pick<EventCardData, 'title' | 'description' | 'sourceUrl' | 'forKids'>,
): boolean {
  if (event.forKids) return true;
  return /pre deti|kidstown|škola korčuľ|skola korcul|detsk[éea]|deti\s+od\s*\d|letn[aá]\s+škola|letna\s+skola|zumba\s*kid|j[oó]ga\s+pre\s+deti|fitness\s*&\s*fun/i.test(
    audienceHaystack(event),
  );
}

export function eventMatchesAudience(
  event: Pick<EventCardData, 'title' | 'description' | 'sourceUrl' | 'forKids'>,
  audience: EventAudience,
): boolean {
  if (audience === 'all') return true;
  if (audience === 'women') return eventMatchesWomen(event);
  return eventMatchesKids(event);
}

export function applyEventAudienceFilter<T>(
  items: T[],
  audience: EventAudience,
  accessor: (item: T) => Pick<EventCardData, 'title' | 'description' | 'sourceUrl' | 'forKids'>,
): T[] {
  if (audience === 'all') return items;
  return items.filter((item) => eventMatchesAudience(accessor(item), audience));
}
