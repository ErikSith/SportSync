export const EVENT_TYPES = ['official', 'community'] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export function eventTypeLabel(type: EventType): string {
  return type === 'official' ? 'Official Event' : 'Community Event';
}

export function eventTypeBadge(type: EventType): { label: string; className: string; icon?: string } {
  if (type === 'official') {
    return {
      label: 'OFFICIAL',
      className: 'bg-secondary/90 text-on-secondary',
      icon: 'verified',
    };
  }
  return {
    label: 'COMMUNITY',
    className: 'bg-primary-container/90 text-white',
    icon: 'groups',
  };
}
