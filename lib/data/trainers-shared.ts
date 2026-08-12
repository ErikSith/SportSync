export interface CoachCardData {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  city: string | null;
  karmaScore: number;
  sports: string[];
  lowestPrice: number | null;
  nextAvailableAt: Date | null;
  specialty: string;
  yearsExp: number;
  distanceMiles: number | null;
  isNew: boolean;
  totalSessions: number;
}

export interface CoachLessonData {
  id: string;
  title: string;
  description: string | null;
  sport: string;
  level: string;
  pricePerPerson: number;
  capacity: number;
  bookedCount: number;
  durationMinutes: number;
  startsAt: Date;
  status: string;
  venueName: string | null;
  venueId: string | null;
  isBooked: boolean;
  bookingStatus: string | null;
  isFull: boolean;
}

export interface CoachDetailData {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  city: string | null;
  karmaScore: number;
  seasonPts: number;
  sports: string[];
  lessons: CoachLessonData[];
  specialty: string;
  yearsExp: number;
  totalSessions: number;
  isShowcase: boolean;
}

export function formatCoachRating(karmaScore: number): string {
  return Math.min(karmaScore / 20, 5).toFixed(1);
}

export function formatDistanceMiles(miles: number | null): string | null {
  if (miles === null) return null;
  if (miles < 0.1) return '< 0.1 mi';
  return `${miles.toFixed(1)} mi`;
}
