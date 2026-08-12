import { PrismaClient } from '@prisma/client';
import { SHOWCASE, SHOWCASE_BA } from '../../lib/demo/showcase';

function inHours(h: number): Date {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

const PARTICIPANT_IDS = [SHOWCASE.hostId, SHOWCASE.organizerId] as const;

export async function seedShowcaseLobby(prisma: PrismaClient): Promise<void> {
  const lobbyData = {
    hostId: SHOWCASE.hostId,
    venueId: SHOWCASE.venueId,
    sport: 'PADEL',
    format: 'doubles',
    skillLevel: 4,
    spotsTotal: 4,
    spotsFilled: 3,
    status: 'open',
    splitPay: true,
    costPerPlayer: 12,
    mercenaryMode: true,
    city: 'Bratislava',
    scheduledAt: inHours(48),
    latitude: SHOWCASE_BA.lat,
    longitude: SHOWCASE_BA.lng,
  };

  await prisma.lobby.upsert({
    where: { id: SHOWCASE.lobbyId },
    create: { id: SHOWCASE.lobbyId, ...lobbyData },
    update: lobbyData,
  });

  for (const userId of PARTICIPANT_IDS) {
    await prisma.lobbyParticipant.upsert({
      where: { lobbyId_userId: { lobbyId: SHOWCASE.lobbyId, userId } },
      create: {
        lobbyId: SHOWCASE.lobbyId,
        userId,
        paymentStatus: 'paid',
      },
      update: {
        paymentStatus: 'paid',
      },
    });
  }

  // MVP showcase: two roster rows, spotsFilled 3 for progress bar / mercenary +1 UI.
  // `update_lobby_spots` trigger recomputes spotsFilled from participant count on insert.
  await prisma.lobby.update({
    where: { id: SHOWCASE.lobbyId },
    data: { spotsFilled: 3, status: 'open' },
  });
}
