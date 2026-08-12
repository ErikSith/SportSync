import { LessonStatus, Sport, UserRole } from '@prisma/client';
import { config } from '../config';
import { boundingBox, distanceKm } from '../lib/geo';
import { resolveCity } from '../lib/geocode';
import { prisma } from '../lib/prisma';
import { HttpError } from '../middleware/errorHandler';
import { awardKarma } from './karmaService';
import { requireRole } from './userService';

export interface CreateLessonInput {
  coachId: string;
  sport: Sport;
  title: string;
  description?: string;
  lat: number;
  lng: number;
  city?: string;
  dateTime: Date;
  durationMinutes?: number;
  capacity?: number;
  priceCents?: number;
}

/** "COACH môže do systému zadávať tréningové lekcie." Only a COACH profile may publish lessons. */
export async function createLesson(input: CreateLessonInput) {
  await requireRole(input.coachId, [UserRole.COACH]);
  const city = resolveCity(input.lat, input.lng, input.city);

  const lesson = await prisma.trainingLesson.create({
    data: {
      coachId: input.coachId,
      sport: input.sport,
      title: input.title,
      description: input.description,
      city,
      lat: input.lat,
      lng: input.lng,
      dateTime: input.dateTime,
      durationMinutes: input.durationMinutes ?? 60,
      capacity: input.capacity ?? 1,
      priceCents: input.priceCents ?? 0,
      status: LessonStatus.OPEN,
    },
  });

  await awardKarma(input.coachId, 'LESSON_HOSTED', { sport: lesson.sport, city: lesson.city });
  return lesson;
}

interface NearbyLessonQuery {
  lat: number;
  lng: number;
  sport?: Sport;
  radiusKm: number;
}

async function findLessonsWithinRadius(query: NearbyLessonQuery) {
  const box = boundingBox(query.lat, query.lng, query.radiusKm);

  const lessons = await prisma.trainingLesson.findMany({
    where: {
      status: LessonStatus.OPEN,
      dateTime: { gte: new Date() },
      lat: { gte: box.minLat, lte: box.maxLat },
      lng: { gte: box.minLng, lte: box.maxLng },
      ...(query.sport ? { sport: query.sport } : {}),
    },
    include: { coach: { select: { id: true, name: true, avatarUrl: true, skillRating: true } } },
    orderBy: { dateTime: 'asc' },
  });

  return lessons
    .map((lesson) => ({
      ...lesson,
      distanceKm: Math.round(distanceKm(query.lat, query.lng, lesson.lat, lesson.lng) * 10) / 10,
    }))
    .filter((lesson) => lesson.distanceKm <= query.radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Same 20km / 50km geolocation engine as the Events feed: nearby lessons
 * first, and only if none are found within 20km the search widens to 50km
 * with `show_extended: true`.
 */
export async function getLessonsFeed(params: { lat: number; lng: number; sport?: Sport }) {
  const nearby = await findLessonsWithinRadius({ ...params, radiusKm: config.defaultRadiusKm });
  if (nearby.length > 0) {
    return { lessons: nearby, radius_km: config.defaultRadiusKm, show_extended: false };
  }

  const extended = await findLessonsWithinRadius({ ...params, radiusKm: config.extendedRadiusKm });
  return {
    lessons: extended,
    radius_km: config.extendedRadiusKm,
    show_extended: true,
    message: `Nothing nearby? Check out lessons ${config.extendedRadiusKm}km away.`,
  };
}

export async function getLesson(id: string) {
  const lesson = await prisma.trainingLesson.findUnique({
    where: { id },
    include: {
      coach: { select: { id: true, name: true, avatarUrl: true, skillRating: true } },
      bookings: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
    },
  });
  if (!lesson) throw new HttpError(404, 'Training lesson not found');
  return lesson;
}

/** A player books a slot in a coach's lesson. */
export async function bookLesson(lessonId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const lesson = await tx.trainingLesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new HttpError(404, 'Training lesson not found');
    if (lesson.status !== LessonStatus.OPEN) {
      throw new HttpError(409, `Lesson is ${lesson.status}`);
    }
    if (lesson.bookedCount >= lesson.capacity) {
      throw new HttpError(409, 'Lesson is fully booked');
    }

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError(404, `User ${userId} not found`);

    await tx.trainingLessonBooking.create({ data: { lessonId, userId } });

    const bookedCount = lesson.bookedCount + 1;
    const updated = await tx.trainingLesson.update({
      where: { id: lessonId },
      data: {
        bookedCount,
        status: bookedCount >= lesson.capacity ? LessonStatus.FULL : LessonStatus.OPEN,
      },
    });

    await awardKarma(userId, 'LESSON_BOOKED', { client: tx, sport: lesson.sport, city: lesson.city });
    return updated;
  });
}
