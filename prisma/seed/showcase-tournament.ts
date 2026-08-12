import {
  PrismaClient,
  TournamentFormat,
  TournamentStatus,
  RegistrationStatus,
} from '@prisma/client';
import { SHOWCASE } from '../../lib/demo/showcase';

function inDays(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

const DESCRIPTION =
  'Welcome to the SportSync Grand Slam Open — the premier padel championship on the Bratislava circuit. This elite single-elimination event brings together the region\'s most competitive players for three days of high-intensity doubles action on world-class indoor courts.\n\n' +
  'Eligibility & Skill Rating: Entry is restricted to players with a verified SportSync skill rating between 1200 and 1800. All participants must complete profile verification and link an active payment method before the registration deadline. Organizers reserve the right to reject entries that do not meet the rating threshold.\n\n' +
  'Format & Seeding: The tournament follows a standard single-elimination bracket for 32 teams (64 players). Seeding is determined by current SportSync rating at registration close. Matches are best-of-three sets to 6 games; a 7-point tiebreak decides the third set at 6–6. The final is played on Center Court with live scoring displayed in the SportSync app.\n\n' +
  'Rules & Conduct: World Padel Tour rules apply unless otherwise noted. Each team receives one 90-second timeout per match. Unsportsmanlike conduct, repeated lateness, or no-shows may result in disqualification without refund. Players must check in at the venue desk at least 30 minutes before their scheduled match.\n\n' +
  'Prizes & Awards: The champion team receives the Grand Slam trophy, 500 season points, and a featured profile badge for 90 days. Runners-up and semi-finalists earn season points and karma bonuses credited automatically after the final whistle.';

const COVER_URL =
  'https://images.unsplash.com/photo-1622163646691-0949864a954c?auto=format&fit=crop&w=1200&q=80';

export async function seedShowcaseTournament(prisma: PrismaClient): Promise<void> {
  const registrationDeadline = inDays(14);
  const startsAt = inDays(21);
  const endsAt = inDays(24);

  await prisma.tournament.upsert({
    where: { id: SHOWCASE.tournamentId },
    create: {
      id: SHOWCASE.tournamentId,
      organizerId: SHOWCASE.organizerId,
      venueId: SHOWCASE.venueId,
      name: 'SportSync Grand Slam Open',
      description: DESCRIPTION,
      sport: 'PADEL',
      format: TournamentFormat.SINGLE_ELIMINATION,
      status: TournamentStatus.REGISTRATION_OPEN,
      entryFee: 45,
      maxParticipants: 32,
      currentParticipants: 18,
      skillLevelMin: 1200,
      skillLevelMax: 1800,
      registrationDeadline,
      startsAt,
      endsAt,
      coverUrl: COVER_URL,
    },
    update: {
      organizerId: SHOWCASE.organizerId,
      venueId: SHOWCASE.venueId,
      name: 'SportSync Grand Slam Open',
      description: DESCRIPTION,
      sport: 'PADEL',
      format: TournamentFormat.SINGLE_ELIMINATION,
      status: TournamentStatus.REGISTRATION_OPEN,
      entryFee: 45,
      maxParticipants: 32,
      currentParticipants: 18,
      skillLevelMin: 1200,
      skillLevelMax: 1800,
      registrationDeadline,
      startsAt,
      endsAt,
      coverUrl: COVER_URL,
    },
  });

  const registrationUsers = [
    { userId: SHOWCASE.organizerId, seed: 1 },
    { userId: SHOWCASE.hostId, seed: 2 },
  ];

  for (const { userId, seed } of registrationUsers) {
    await prisma.tournamentRegistration.upsert({
      where: {
        tournamentId_userId: {
          tournamentId: SHOWCASE.tournamentId,
          userId,
        },
      },
      create: {
        tournamentId: SHOWCASE.tournamentId,
        userId,
        status: RegistrationStatus.CONFIRMED,
        seed,
      },
      update: {
        status: RegistrationStatus.CONFIRMED,
        seed,
      },
    });
  }
}
