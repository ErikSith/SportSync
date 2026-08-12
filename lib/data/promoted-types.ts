import type { EventCardData } from '@/lib/data/events';
import type { TournamentCardData } from '@/lib/data/tournaments';

export type PromotedKind = 'event' | 'tournament';

export interface PromotedBannerItem {
  id: string;
  kind: PromotedKind;
  title: string;
  sport: string;
  startsAt: Date;
  venueName: string | null;
  city: string;
  priceLabel: string;
  coverUrl: string | null;
  sponsorLogoUrl: string | null;
  sponsorName: string | null;
  badgeText: string;
  accentColor: string;
  promotedUntil: Date;
  /** Design mock — not a paid placement yet */
  isPreview?: boolean;
  event: EventCardData | null;
  tournament: TournamentCardData | null;
}
