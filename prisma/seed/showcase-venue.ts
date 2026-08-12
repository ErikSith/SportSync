import { PrismaClient } from '@prisma/client';
import { SHOWCASE, SHOWCASE_BA } from '../../lib/demo/showcase';

/**
 * Showcase demo links to the real Aurial Padel Bratislava venue.
 * Does not invent a fictional "Apex Elite" facility.
 */
export async function seedShowcaseVenue(prisma: PrismaClient): Promise<void> {
  const existing = await prisma.venue.findUnique({ where: { id: SHOWCASE.venueId } });

  if (existing) {
    await prisma.venue.update({
      where: { id: SHOWCASE.venueId },
      data: {
        verified: true,
        latitude: existing.latitude ?? SHOWCASE_BA.lat,
        longitude: existing.longitude ?? SHOWCASE_BA.lng,
      },
    });
    return;
  }

  const byName = await prisma.venue.findFirst({
    where: { name: 'Aurial Padel Bratislava', city: 'Bratislava' },
    select: { id: true },
  });
  if (byName) return;

  await prisma.venue.create({
    data: {
      id: SHOWCASE.venueId,
      ownerId: SHOWCASE.organizerId,
      name: 'Aurial Padel Bratislava',
      description:
        'Largest padel centre in Bratislava with indoor WPT-standard courts on Bajkalská. Daily play, on-site restaurant and equipment rental.',
      address: 'Bajkalská 7, 831 04 Bratislava',
      city: 'Bratislava',
      sports: ['PADEL'],
      verified: true,
      latitude: 48.1478,
      longitude: 17.1289,
      amenities: {
        parking: true,
        showers: true,
        proShop: true,
        floodlights: true,
        restaurant: true,
      },
      openingHours: {
        mon_fri: '08:00-22:00',
        saturday: '08:00-22:00',
        sunday: '08:00-22:00',
      },
    },
  });
}
