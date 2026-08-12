import { PrismaClient } from '@prisma/client';
import { SHOWCASE, SHOWCASE_BA } from '../../lib/demo/showcase';

const PADEL_COVER_URL =
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&q=80';

function inHours(h: number): Date {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

export async function seedShowcaseEvent(prisma: PrismaClient): Promise<void> {
  const eventData = {
    organizerId: SHOWCASE.organizerId,
    venueId: SHOWCASE.venueId,
    type: 'official',
    status: 'open',
    sport: 'PADEL',
    title: 'Midnight Padel Masters',
    description:
      'An elite after-dark doubles session under floodlights at Aurial Padel Bratislava. ' +
      'Eight spots, ranked-style pairings, and a fast round-robin before the knockout bracket. ' +
      'Bring your A-game — this is the showcase official event for SportSync\'s Events tab.',
    city: 'Bratislava',
    latitude: SHOWCASE_BA.lat,
    longitude: SHOWCASE_BA.lng,
    price: 25,
    capacity: 8,
    registeredCount: 5,
    startsAt: inHours(36),
    coverUrl: PADEL_COVER_URL,
  };

  await prisma.event.upsert({
    where: { id: SHOWCASE.eventId },
    create: { id: SHOWCASE.eventId, ...eventData },
    update: eventData,
  });
}
