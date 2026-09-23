import type { EventSport } from '@/lib/constants/sports';

export const LISTING_KINDS = [
  'event',
  'tournament',
  'camp',
  'workshop',
  'course',
] as const;

export type ListingKind = (typeof LISTING_KINDS)[number];

export interface ListingFromImage {
  title: string;
  sport: EventSport;
  date: string;
  time: string;
  endDate: string;
  endTime: string;
  place: string;
  price: string;
  capacity: string;
  link: string;
  description: string;
  kind: ListingKind;
}
