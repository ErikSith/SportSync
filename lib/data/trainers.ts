import { createClient } from '@/lib/supabase/server';
import { SHOWCASE } from '@/lib/demo/showcase';
import { SHOWCASE_SPECIALTY } from '@/lib/demo/showcase-trainer-content';
import {
  type CoachCardData,
  type CoachDetailData,
  type CoachLessonData,
} from '@/lib/data/trainers-shared';

export type { CoachCardData, CoachDetailData, CoachLessonData } from '@/lib/data/trainers-shared';
export { formatCoachRating, formatDistanceMiles } from '@/lib/data/trainers-shared';

interface CoachesQuery {
  sport?: string;
  search?: string;
  sort?: string;
  viewerLat?: number | null;
  viewerLng?: number | null;
}

interface LessonRow {
  id: string;
  title: string;
  description: string | null;
  sport: string;
  level: string;
  price_per_person: number | string;
  capacity: number;
  booked_count: number;
  duration_minutes: number;
  starts_at: string;
  status: string;
  venue_id: string | null;
  venues: { name: string } | { name: string }[] | null;
  training_lesson_bookings?: Array<{ user_id: string; status: string }>;
}

interface CoachRow {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  karma_score: number | string | null;
  season_pts: number | null;
  created_at?: string;
  training_lessons: LessonRow[] | null;
}

const SPORT_SPECIALTY: Record<string, string> = {
  STRENGTH: 'Master Strength Coach',
  HIIT: 'HIIT Specialist',
  TENNIS: 'Pro Prep Athletics',
  PADEL: 'Padel Performance Coach',
  RUNNING: 'Endurance Coach',
  CYCLING: 'Cycling Coach',
  FOOTBALL: 'Football Conditioning Coach',
  BASKETBALL: 'Basketball Skills Coach',
  GOLF: 'Golf Performance Coach',
  SQUASH: 'Squash Coach',
  YOGA: 'Yoga & Mobility Coach',
};

function venueNameFromRow(venues: LessonRow['venues']): string | null {
  if (!venues) return null;
  if (Array.isArray(venues)) return venues[0]?.name ?? null;
  return venues.name;
}

function coachDisplayName(row: Pick<CoachRow, 'full_name' | 'username'>): string {
  return row.full_name?.trim() || row.username;
}

function upcomingLessons(lessons: LessonRow[] | null | undefined, now: Date): LessonRow[] {
  if (!lessons) return [];
  return lessons.filter((lesson) => lesson.status === 'SCHEDULED' && new Date(lesson.starts_at) >= now);
}

function distinctSports(lessons: LessonRow[]): string[] {
  return [...new Set(lessons.map((lesson) => lesson.sport))];
}

function specialtyForCoach(coach: CoachRow, sports: string[]): string {
  if (coach.id === SHOWCASE.coachId) return SHOWCASE_SPECIALTY;
  const primary = sports[0]?.toUpperCase();
  if (primary && SPORT_SPECIALTY[primary]) return SPORT_SPECIALTY[primary];
  if (primary) return `${primary.charAt(0)}${primary.slice(1).toLowerCase()} Coach`;
  return 'Performance Coach';
}

function yearsExperience(coach: CoachRow, totalSessions: number): number {
  if (coach.id === SHOWCASE.coachId) return 12;
  if (coach.created_at) {
    const created = new Date(coach.created_at);
    const years = Math.floor((Date.now() - created.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (years >= 1) return years;
  }
  return Math.max(1, Math.floor(totalSessions / 40));
}

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mapLessonRow(lesson: LessonRow, viewerId: string): CoachLessonData {
  const bookings = lesson.training_lesson_bookings ?? [];
  const viewerBooking = bookings.find((b) => b.user_id === viewerId && b.status !== 'CANCELLED');
  const isBooked = !!viewerBooking;
  const isFull = lesson.booked_count >= lesson.capacity;

  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    sport: lesson.sport,
    level: lesson.level,
    pricePerPerson: Number(lesson.price_per_person),
    capacity: lesson.capacity,
    bookedCount: lesson.booked_count,
    durationMinutes: lesson.duration_minutes,
    startsAt: new Date(lesson.starts_at),
    status: lesson.status,
    venueName: venueNameFromRow(lesson.venues),
    venueId: lesson.venue_id ?? null,
    isBooked,
    bookingStatus: viewerBooking?.status ?? null,
    isFull,
  };
}

/** Lists all coaches with upcoming lesson metadata. Uses Supabase REST + RLS. */
export async function getCoaches(query: CoachesQuery = {}): Promise<CoachCardData[]> {
  const supabase = await createClient();
  const now = new Date();

  const { data, error } = await supabase
    .from('profiles')
    .select(
      `
      id,
      username,
      full_name,
      avatar_url,
      city,
      latitude,
      longitude,
      karma_score,
      created_at,
      training_lessons (
        id,
        sport,
        price_per_person,
        starts_at,
        status
      )
    `,
    )
    .eq('role', 'COACH')
    .order('karma_score', { ascending: false });

  if (error || !data) {
    if (error && process.env.NODE_ENV !== 'production') console.error('[trainers.getCoaches]', error.message);
    return [];
  }

  const search = query.search?.trim().toLowerCase();
  const sportFilter = query.sport && query.sport !== 'ALL' ? query.sport.toUpperCase() : null;
  const hasViewerLocation = query.viewerLat != null && query.viewerLng != null;

  return (data as CoachRow[])
    .map((coach) => {
      const allLessons = coach.training_lessons ?? [];
      const lessons = upcomingLessons(allLessons, now);
      const prices = lessons.map((lesson) => Number(lesson.price_per_person));
      const nextLesson = lessons.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0];
      const sports = distinctSports(lessons.length > 0 ? lessons : allLessons);
      const totalSessions = allLessons.length;
      const karmaScore = Number(coach.karma_score ?? 0);

      let distanceMiles: number | null = null;
      if (hasViewerLocation && coach.latitude != null && coach.longitude != null) {
        distanceMiles = haversineMiles(query.viewerLat!, query.viewerLng!, coach.latitude, coach.longitude);
      }

      return {
        coach,
        lessons,
        card: {
          id: coach.id,
          name: coachDisplayName(coach),
          username: coach.username,
          avatarUrl: coach.avatar_url,
          city: coach.city,
          karmaScore,
          sports,
          lowestPrice: prices.length > 0 ? Math.min(...prices) : null,
          nextAvailableAt: nextLesson ? new Date(nextLesson.starts_at) : null,
          specialty: specialtyForCoach(coach, sports),
          yearsExp: yearsExperience(coach, totalSessions),
          distanceMiles,
          isNew: karmaScore < 25 && coach.id !== SHOWCASE.coachId,
          totalSessions,
        },
      };
    })
    .filter(({ lessons, coach }) => {
      if (coach.id === SHOWCASE.coachId) return true;
      if (!sportFilter) return lessons.length > 0 || (coach.training_lessons?.length ?? 0) > 0;
      const allSports = distinctSports(coach.training_lessons ?? []);
      return allSports.some((sport) => sport.toUpperCase() === sportFilter);
    })
    .filter(({ coach, card }) => {
      if (!search) return true;
      return (
        card.name.toLowerCase().includes(search) ||
        coach.username.toLowerCase().includes(search) ||
        card.specialty.toLowerCase().includes(search) ||
        card.sports.some((sport) => sport.toLowerCase().includes(search)) ||
        (coach.city?.toLowerCase().includes(search) ?? false)
      );
    })
    .map(({ card }) => card)
    .sort((a, b) => {
      if (query.sort === 'rating') return b.karmaScore - a.karmaScore;
      return 0;
    });
}

/** Full coach profile with upcoming lessons and per-viewer booking state. */
export async function getCoachById(id: string, viewerId: string): Promise<CoachDetailData | null> {
  const supabase = await createClient();
  const now = new Date();

  const { data, error } = await supabase
    .from('profiles')
    .select(
      `
      id,
      username,
      full_name,
      avatar_url,
      city,
      latitude,
      longitude,
      karma_score,
      season_pts,
      created_at,
      role,
      training_lessons (
        id,
        title,
        description,
        sport,
        level,
        price_per_person,
        capacity,
        booked_count,
        duration_minutes,
        starts_at,
        status,
        venue_id,
        venues ( name ),
        training_lesson_bookings ( user_id, status )
      )
    `,
    )
    .eq('id', id)
    .eq('role', 'COACH')
    .maybeSingle();

  if (error || !data) return null;

  const coach = data as CoachRow;
  const allLessons = coach.training_lessons ?? [];
  const lessons = upcomingLessons(allLessons, now)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .map((lesson) => mapLessonRow(lesson, viewerId));
  const sports = distinctSports(upcomingLessons(allLessons, now).length > 0 ? upcomingLessons(allLessons, now) : allLessons);

  return {
    id: coach.id,
    name: coachDisplayName(coach),
    username: coach.username,
    avatarUrl: coach.avatar_url,
    city: coach.city,
    karmaScore: Number(coach.karma_score ?? 0),
    seasonPts: coach.season_pts ?? 0,
    sports,
    lessons,
    specialty: specialtyForCoach(coach, sports),
    yearsExp: yearsExperience(coach, allLessons.length),
    totalSessions: allLessons.length,
    isShowcase: coach.id === SHOWCASE.coachId,
  };
}
