import type { EventCardData } from '@/lib/data/events';

/**
 * Client-safe mock for empty Eventy feed — not stored in DB.
 */
export function getSamplePadelEvent(): EventCardData {
  const startsAt = new Date();
  startsAt.setDate(startsAt.getDate() + 3);
  startsAt.setHours(18, 30, 0, 0);

  return {
    id: '00000000-0000-4000-8000-00000000d001',
    title: 'Večerný padel open',
    description:
      'Otvorený padel večer pre všetky úrovne. Mix dvojíc, rakety požičiame na mieste. Ukážka event karty vo feede.',
    sport: 'PADEL',
    sportType: 'OTHER',
    type: 'community',
    city: 'Bratislava',
    startsAt,
    endsAt: null,
    timeKnown: true,
    price: 15,
    priceCents: 1500,
    currency: 'EUR',
    coverUrl: null,
    capacity: 12,
    maxParticipants: 12,
    registeredCount: 4,
    status: 'open',
    distanceKm: 1.2,
    venueId: null,
    venueName: 'Aurial Padel Bratislava',
    latitude: 48.15,
    longitude: 17.12,
    themeConfig: {},
    participationMode: 'participate',
    ticketUrl: null,
    sourceUrl: null,
    sourceName: null,
    source: null,
    externalId: null,
    isAggregated: false,
    forKids: false,
    forWomen: false,
    sourceExcerpt: null,
    sourceEvidence: null,
  };
}
