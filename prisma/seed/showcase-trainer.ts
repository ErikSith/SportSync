import { PrismaClient, Role, SkillLevel, LessonStatus } from '@prisma/client';
import { SHOWCASE, SHOWCASE_BA } from '../../lib/demo/showcase';
import { SHOWCASE_AVATAR } from '../../lib/demo/showcase-trainer-content';

function inHours(h: number): Date {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

export async function seedShowcaseTrainer(prisma: PrismaClient): Promise<void> {
  await prisma.profile.upsert({
    where: { id: SHOWCASE.coachId },
    create: {
      id: SHOWCASE.coachId,
      email: 'marcus.vance@sportsync.app',
      username: 'marcus_vance',
      fullName: 'Marcus Vance',
      avatarUrl: SHOWCASE_AVATAR,
      role: Role.COACH,
      city: 'Bratislava',
      latitude: SHOWCASE_BA.lat + 0.01,
      longitude: SHOWCASE_BA.lng + 0.008,
      seasonPts: 820,
    },
    update: {
      fullName: 'Marcus Vance',
      avatarUrl: SHOWCASE_AVATAR,
      role: Role.COACH,
      city: 'Bratislava',
      latitude: SHOWCASE_BA.lat + 0.01,
      longitude: SHOWCASE_BA.lng + 0.008,
      seasonPts: 820,
    },
  });

  const lessons = [
    {
      title: 'Strength Focus',
      description: 'Compound lifts, progressive overload, and mobility prep for elite athletes.',
      sport: 'STRENGTH',
      level: SkillLevel.INTERMEDIATE,
      pricePerPerson: 55,
      capacity: 2,
      bookedCount: 0,
      durationMinutes: 90,
      startsAt: inHours(4),
    },
    {
      title: 'HIIT Protocol',
      description: 'High-intensity intervals with heart-rate telemetry and recovery blocks.',
      sport: 'HIIT',
      level: SkillLevel.ADVANCED,
      pricePerPerson: 45,
      capacity: 4,
      bookedCount: 1,
      durationMinutes: 60,
      startsAt: inHours(28),
    },
    {
      title: 'Pro Athlete Prep',
      description: 'Sport-specific power development and pre-season conditioning.',
      sport: 'TENNIS',
      level: SkillLevel.ADVANCED,
      pricePerPerson: 70,
      capacity: 1,
      bookedCount: 0,
      durationMinutes: 75,
      startsAt: inHours(52),
    },
  ] as const;

  for (const lesson of lessons) {
    const existing = await prisma.trainingLesson.findFirst({
      where: { coachId: SHOWCASE.coachId, title: lesson.title },
    });

    if (existing) {
      await prisma.trainingLesson.update({
        where: { id: existing.id },
        data: {
          ...lesson,
          coachId: SHOWCASE.coachId,
          venueId: SHOWCASE.venueId,
          status: LessonStatus.SCHEDULED,
        },
      });
    } else {
      await prisma.trainingLesson.create({
        data: {
          ...lesson,
          coachId: SHOWCASE.coachId,
          venueId: SHOWCASE.venueId,
          status: LessonStatus.SCHEDULED,
        },
      });
    }
  }

  await prisma.karmaEvent.createMany({
    data: [
      { subjectId: SHOWCASE.coachId, type: 'LESSON_PUBLISHED', delta: 45 },
      { subjectId: SHOWCASE.coachId, type: 'LESSON_BOOKED', delta: 30 },
      { subjectId: SHOWCASE.coachId, type: 'EVENT_HOSTED', delta: 23 },
    ],
    skipDuplicates: true,
  });
}
