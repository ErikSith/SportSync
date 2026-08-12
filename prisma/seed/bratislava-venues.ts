import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { BRATISLAVA_VENUES_INVENTORY } from '../../lib/data/bratislava-venues-inventory';

/** Stable UUID from venue name + city for idempotent upserts across re-seeds. */
function deterministicVenueId(name: string, city: string): string {
  const hash = createHash('sha256').update(`${name}|${city}`).digest('hex');
  const variant = ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `${variant}${hash.slice(18, 20)}`,
    hash.slice(20, 32),
  ].join('-');
}

export async function seedBratislavaVenues(
  prisma: PrismaClient,
  ownerId: string | null = null,
): Promise<{ inserted: number }> {
  let inserted = 0;

  for (const venue of BRATISLAVA_VENUES_INVENTORY) {
    const existing = await prisma.venue.findFirst({
      where: { name: venue.name, city: venue.city },
      select: { id: true },
    });

    const id = existing?.id ?? deterministicVenueId(venue.name, venue.city);

    const data = {
      ownerId,
      name: venue.name,
      description: venue.description,
      address: venue.address,
      city: venue.city,
      sports: venue.sports,
      latitude: venue.latitude,
      longitude: venue.longitude,
      verified: venue.verified,
      amenities: venue.amenities,
      openingHours: venue.openingHours,
    };

    if (existing) {
      await prisma.venue.update({ where: { id }, data });
    } else {
      await prisma.venue.create({ data: { id, ...data } });
      inserted++;
    }
  }

  return { inserted };
}
