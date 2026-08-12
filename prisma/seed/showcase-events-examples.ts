import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { SHOWCASE_BA } from '../../lib/demo/showcase';

const MARATHON_COVER_URL =
  'https://images.unsplash.com/photo-1452626038307-9d295b0ddde2?w=1200&q=80';
const PADEL_COVER_URL =
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&q=80';

function inHours(h: number): Date {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

/** Stable UUID from event title + city for idempotent upserts across re-seeds. */
function deterministicEventId(title: string, city: string): string {
  const hash = createHash('sha256').update(`event|${title}|${city}`).digest('hex');
  const variant = ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `${variant}${hash.slice(18, 20)}`,
    hash.slice(20, 32),
  ].join('-');
}

export async function seedShowcaseEventExamples(
  prisma: PrismaClient,
  organizerId: string,
): Promise<void> {
  const examples = [
    {
      title: 'Bratislava Marathon 2026',
      type: 'official',
      sport: 'RUNNING',
      description:
        'The flagship city marathon — 42.195 km through Bratislava\'s historic centre and Danube embankment. ' +
        'Chip timing, aid stations every 5 km, and a finisher medal for all participants.',
      city: 'Bratislava',
      latitude: SHOWCASE_BA.lat,
      longitude: SHOWCASE_BA.lng,
      price: 35,
      capacity: 5000,
      registeredCount: 1247,
      startsAt: inHours(24 * 45),
      coverUrl: MARATHON_COVER_URL,
      status: 'open',
    },
    {
      title: 'Sobotný padel s deťmi',
      type: 'community',
      sport: 'PADEL',
      description:
        'Príjemný sobotný padel pre rodiny s deťmi. Hráme vo dvojiciach, tempo je pohodové a deti sú vítané na bočných kurtách. ' +
        'Stačí prísť v športovom oblečení — rakety požičiame na mieste.',
      city: 'Bratislava',
      latitude: 48.152,
      longitude: 17.11,
      price: 0,
      capacity: 8,
      registeredCount: 3,
      startsAt: inHours(24 * 3 + 10),
      coverUrl: PADEL_COVER_URL,
      status: 'open',
    },
  ] as const;

  for (const example of examples) {
    const existing = await prisma.event.findFirst({
      where: { title: example.title, city: example.city },
      select: { id: true },
    });

    const id = existing?.id ?? deterministicEventId(example.title, example.city);

    const data = {
      organizerId,
      type: example.type,
      status: example.status,
      sport: example.sport,
      title: example.title,
      description: example.description,
      city: example.city,
      latitude: example.latitude,
      longitude: example.longitude,
      price: example.price,
      capacity: example.capacity,
      registeredCount: example.registeredCount,
      startsAt: example.startsAt,
      coverUrl: example.coverUrl,
    };

    if (existing) {
      await prisma.event.update({ where: { id }, data });
    } else {
      await prisma.event.create({ data: { id, ...data } });
    }
  }
}
