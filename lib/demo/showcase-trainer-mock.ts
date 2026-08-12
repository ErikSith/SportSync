import { SHOWCASE } from '@/lib/demo/showcase';
import { SHOWCASE_SPECIALTY } from '@/lib/demo/showcase-trainer-content';
import type { CoachDetailData } from '@/lib/data/trainers-shared';

function inHours(h: number): Date {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

/** Mock coach data for /trainers/preview — no DB required. */
export const SHOWCASE_MOCK_COACH: CoachDetailData = {
  id: SHOWCASE.coachId,
  name: 'Marcus Vance',
  username: 'marcus_vance',
  avatarUrl:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAlr4J23QQdzxF-Kf-WcY1w11bw06ekGKbmnI1feZ3Bk1cdKcp4s7bZkTnT6rHQawWdg0Hjf4Okbty5Z0p-bSQHOtqMTW-3J8jeEoWxujZkNEDFQpm1gPnv_8bEXDo9UbN6O0jy0FyL7VreSE_piKyzWj5Cb0M_0Xpel4nhuCkmqA3HGGmF1_bfPpgU-Upt9-46Brsa2y3PHap7enyqU4PI5JKtQOsuks7zNKwyknl5mp4TgnvQzMJmi2z-mDiJCDUyJqIVcHamZO0',
  city: 'Bratislava',
  karmaScore: 98,
  seasonPts: 820,
  sports: ['STRENGTH', 'HIIT', 'TENNIS'],
  specialty: SHOWCASE_SPECIALTY,
  yearsExp: 12,
  totalSessions: 3,
  isShowcase: true,
  lessons: [
    {
      id: '00000000-0000-4000-a000-000000000601',
      title: 'Strength Focus',
      description: 'Compound lifts, progressive overload, and mobility prep for elite athletes.',
      sport: 'STRENGTH',
      level: 'INTERMEDIATE',
      pricePerPerson: 55,
      capacity: 2,
      bookedCount: 0,
      durationMinutes: 90,
      startsAt: inHours(4),
      status: 'SCHEDULED',
      venueName: 'Aurial Padel Bratislava',
      venueId: SHOWCASE.venueId,
      isBooked: false,
      bookingStatus: null,
      isFull: false,
    },
    {
      id: '00000000-0000-4000-a000-000000000602',
      title: 'HIIT Protocol',
      description: 'High-intensity intervals with heart-rate telemetry and recovery blocks.',
      sport: 'HIIT',
      level: 'ADVANCED',
      pricePerPerson: 45,
      capacity: 4,
      bookedCount: 1,
      durationMinutes: 60,
      startsAt: inHours(28),
      status: 'SCHEDULED',
      venueName: 'Aurial Padel Bratislava',
      venueId: SHOWCASE.venueId,
      isBooked: false,
      bookingStatus: null,
      isFull: false,
    },
    {
      id: '00000000-0000-4000-a000-000000000603',
      title: 'Pro Athlete Prep',
      description: 'Sport-specific power development and pre-season conditioning.',
      sport: 'TENNIS',
      level: 'ADVANCED',
      pricePerPerson: 70,
      capacity: 1,
      bookedCount: 0,
      durationMinutes: 75,
      startsAt: inHours(52),
      status: 'SCHEDULED',
      venueName: 'Aurial Padel Bratislava',
      venueId: SHOWCASE.venueId,
      isBooked: false,
      bookingStatus: null,
      isFull: false,
    },
  ],
};
