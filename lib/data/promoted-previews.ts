import type { EventCardData } from '@/lib/data/events';
import type { TournamentCardData } from '@/lib/data/tournaments';
import type { PromotedBannerItem } from '@/lib/data/promoted-types';

/**
 * Design mockups for the paid slot — shown until real promotions exist.
 * Client-safe (no Supabase server imports).
 */
export function getPromotedBannerPreviews(): PromotedBannerItem[] {
  const until = new Date();
  until.setDate(until.getDate() + 14);

  const padelStarts = new Date();
  padelStarts.setDate(padelStarts.getDate() + 5);
  padelStarts.setHours(10, 0, 0, 0);

  const fitnessStarts = new Date();
  fitnessStarts.setDate(fitnessStarts.getDate() + 1);
  fitnessStarts.setHours(17, 0, 0, 0);

  const padelTournament: TournamentCardData = {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Aurial Open — Challenger Night',
    description:
      'Večerný padel knock-out pre mierne pokročilých. Oficiálny partner Bullpadel — ukážka, ako vyzerá sponzorovaný slot na home.',
    sport: 'PADEL',
    format: 'SINGLE_ELIMINATION',
    status: 'REGISTRATION_OPEN',
    entryFee: 50,
    currentParticipants: 5,
    maxParticipants: 8,
    coverUrl: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&q=80',
    startsAt: padelStarts,
    endsAt: null,
    registrationDeadline: padelStarts,
    venueId: null,
    venueName: 'Aurial Padel Bratislava',
    venueCity: 'Bratislava',
    venueAddress: null,
    venueLatitude: 48.15,
    venueLongitude: 17.12,
    skillLevelMin: 2,
    skillLevelMax: 3,
    source: null,
    sourceUrl: null,
    ticketUrl: null,
    isAggregated: false,
  };

  const fitnessEvent: EventCardData = {
    id: '00000000-0000-4000-8000-000000000002',
    title: 'Sunset Power Yoga — Eurovea',
    description:
      'Otvorená joga na brehu Dunaja. Partner Form Factory — ukážka prémiového event banneru pred spustením predaja slotov.',
    sport: 'FITNESS',
    sportType: 'OTHER',
    type: 'official',
    city: 'Bratislava',
    startsAt: fitnessStarts,
    price: 0,
    priceCents: 0,
    currency: 'EUR',
    coverUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=80',
    capacity: 40,
    maxParticipants: 40,
    registeredCount: 18,
    status: 'open',
    distanceKm: 2,
    venueId: null,
    venueName: 'Eurovea (Dunaj)',
    latitude: 48.14,
    longitude: 17.12,
    themeConfig: {},
    participationMode: 'participate',
    ticketUrl: null,
    sourceUrl: null,
    sourceName: 'Form Factory',
    source: null,
    externalId: null,
    isAggregated: false,
    forKids: false,
  };

  return [
    {
      id: 'preview:padel-challenger',
      kind: 'tournament',
      title: padelTournament.name,
      sport: 'PADEL',
      startsAt: padelStarts,
      venueName: padelTournament.venueName,
      city: 'Bratislava',
      priceLabel: '€50',
      coverUrl: padelTournament.coverUrl,
      sponsorLogoUrl: null,
      sponsorName: 'Bullpadel',
      badgeText: 'PROMOTED',
      accentColor: '#4ade80',
      promotedUntil: until,
      isPreview: true,
      event: null,
      tournament: padelTournament,
    },
    {
      id: 'preview:sunset-yoga',
      kind: 'event',
      title: fitnessEvent.title,
      sport: 'FITNESS',
      startsAt: fitnessStarts,
      venueName: fitnessEvent.venueName,
      city: 'Bratislava',
      priceLabel: 'Free',
      coverUrl: fitnessEvent.coverUrl,
      sponsorLogoUrl: null,
      sponsorName: 'Form Factory',
      badgeText: 'FEATURED',
      accentColor: '#fb7185',
      promotedUntil: until,
      isPreview: true,
      event: fitnessEvent,
      tournament: null,
    },
  ];
}
