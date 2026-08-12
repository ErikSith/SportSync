import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';

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

export async function seedProfileSuccess(prisma: PrismaClient, janaId: string): Promise<void> {
  await prisma.profile.update({
    where: { id: janaId },
    data: {
      bio: 'Marathon finisher · padel regular · gym 4×/week',
      coverUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCs5nihEHalaKbmsVYFQduENBwPsCwF-GyJu4y2NDJ_wYHczAS-J75VUEUYlFyD5jtsY9Dc4cfVvnm7OuraMA9QLJSF7MFK-GLk0muxRFUb2BkDGYdqZx4EYSet2fhjPVa8XZreR6CX_vhs1rpL21y5GrHUNQTQt_NGs9EDh3A9a5VVnDrp-nXzstyX-eJqvLCG5hq5Y9giFsGVoSUf9s_RC4GMSQgI9JR-FjaPVGUwJIHEwbLZLBMGXX7gBbtvJVrS1MgFMWUVS1o',
      avatarUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuC9RNui7i1KGguQvGbHGT_FVl6XTn1aXlsJtOq7ZSZJY0fHiw3AiCT8Xqvr0vtJKQa-GdfLZfPfrBQYJcnLpJU3OyRGos94pzvX79C8OfyXH9O8nAvf-ebWhTkhvLz8JP2-iY6CCpEJXetAy3Q0OGhsHVWtKJIXPz6sy772O3lWQUuPBLR2uq7xvDiSWYSPzB7UDIn5038KI4QwgPbO23lYV8svsIXthGesY9IVEhO-NkDpnpxONLfNaLRE5UrPoal3anXWPK6RY6Q',
      preferredSports: ['RUNNING', 'PADEL', 'TENNIS'],
    },
  });

  const marathonEventId = deterministicEventId('Bratislava Marathon 2026', 'Bratislava');

  const marathonEvent = await prisma.event.findUnique({ where: { id: marathonEventId } });
  if (marathonEvent) {
    await prisma.eventRegistration.upsert({
      where: { eventId_userId: { eventId: marathonEvent.id, userId: janaId } },
      create: { eventId: marathonEvent.id, userId: janaId, status: 'confirmed' },
      update: { status: 'confirmed' },
    });

    await prisma.eventResult.upsert({
      where: { eventId_userId: { eventId: marathonEvent.id, userId: janaId } },
      create: {
        eventId: marathonEvent.id,
        userId: janaId,
        status: 'finished',
        placement: 1250,
        totalParticipants: 12550,
        finishTime: '3:42:18',
        metadata: { distanceKm: 42.195 },
      },
      update: {
        status: 'finished',
        placement: 1250,
        totalParticipants: 12550,
        finishTime: '3:42:18',
      },
    });
  }

  await prisma.userGoalLog.deleteMany({
    where: { goal: { userId: janaId } },
  });
  await prisma.userGoal.deleteMany({ where: { userId: janaId } });

  const gymGoal = await prisma.userGoal.create({
    data: {
      userId: janaId,
      templateKey: 'gym_weekly',
      title: 'Gym 4×/week for 8 weeks',
      metricType: 'week_streak',
      targetValue: 4,
      targetMeta: { weeks: 8 },
      currentValue: 6,
      trackingMode: 'manual',
      isFeatured: true,
      status: 'active',
    },
  });

  const padelGoal = await prisma.userGoal.create({
    data: {
      userId: janaId,
      templateKey: 'complete_matches',
      title: 'Complete 5 padel matches',
      sport: 'PADEL',
      metricType: 'match_count',
      targetValue: 5,
      targetMeta: { sport: 'PADEL' },
      currentValue: 0,
      trackingMode: 'auto',
      isFeatured: false,
      status: 'active',
    },
  });
  void padelGoal;

  const now = new Date();
  const weekStarts = [0, 1, 2, 3, 4, 5].map((offset) => {
    const d = new Date(now);
    d.setDate(d.getDate() - offset * 7);
    return d;
  });

  for (const weekStart of weekStarts) {
    for (let i = 0; i < 4; i++) {
      const loggedAt = new Date(weekStart);
      loggedAt.setDate(loggedAt.getDate() + i);
      await prisma.userGoalLog.create({
        data: {
          goalId: gymGoal.id,
          value: 1,
          loggedAt,
          note: 'Gym session',
        },
      });
    }
  }
}

export async function seedProfileFriends(prisma: PrismaClient, janaId: string): Promise<void> {
  const marek = await prisma.profile.findUnique({ where: { username: 'marek' }, select: { id: true } });
  const lucia = await prisma.profile.findUnique({ where: { username: 'lucia' }, select: { id: true } });
  const peter = await prisma.profile.findUnique({ where: { username: 'peter' }, select: { id: true } });

  if (marek) {
    await prisma.friendship.upsert({
      where: { requesterId_addresseeId: { requesterId: janaId, addresseeId: marek.id } },
      create: { requesterId: janaId, addresseeId: marek.id, status: 'accepted' },
      update: { status: 'accepted' },
    });
  }

  if (lucia) {
    await prisma.friendship.upsert({
      where: { requesterId_addresseeId: { requesterId: lucia.id, addresseeId: janaId } },
      create: { requesterId: lucia.id, addresseeId: janaId, status: 'accepted' },
      update: { status: 'accepted' },
    });
  }

  if (peter) {
    await prisma.friendship.upsert({
      where: { requesterId_addresseeId: { requesterId: peter.id, addresseeId: janaId } },
      create: { requesterId: peter.id, addresseeId: janaId, status: 'pending' },
      update: { status: 'pending' },
    });
  }
}
