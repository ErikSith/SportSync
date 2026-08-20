import { randomUUID } from 'node:crypto';
import { PrismaClient, Role, SkillLevel, LessonStatus, BookingStatus } from '@prisma/client';
import { SHOWCASE } from '../lib/demo/showcase';
import { BRATISLAVA_VENUES_INVENTORY } from '../lib/data/bratislava-venues-inventory';
import { seedShowcaseVenue } from './seed/showcase-venue';
import { seedBratislavaVenues } from './seed/bratislava-venues';
import { seedShowcaseEvent } from './seed/showcase-event';
import { seedShowcaseEventExamples } from './seed/showcase-events-examples';
import { seedShowcaseLobby } from './seed/showcase-lobby';
import { seedShowcaseTrainer } from './seed/showcase-trainer';
import { seedProfileSuccess, seedProfileFriends } from './seed/profile-success';

const prisma = new PrismaClient();

// Coordinates around Bratislava city centre (48.1486, 17.1077)
const BA = { lat: 48.1486, lng: 17.1077 };

function inHours(h: number): Date {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

/**
 * Seed profiles get random UUIDs instead of real `auth.users` rows — they are
 * demo/display data only and cannot log in. This is safe because `profiles.id`
 * has no DB-level FK to `auth.users` (Supabase Auth links them via the
 * `handle_new_user` trigger on real signups instead). Do not rely on these
 * ids for anything that requires an authenticated session.
 */
async function main() {
  await prisma.userGoalLog.deleteMany();
  await prisma.userGoal.deleteMany();
  await prisma.eventResult.deleteMany();
  await prisma.trainingLessonBooking.deleteMany();
  await prisma.trainingLesson.deleteMany();
  // Keep scraped tournaments (source set by adapters); only wipe seed/demo rows.
  await prisma.tournamentRegistration.deleteMany({
    where: { tournament: { OR: [{ source: null }, { source: '' }] } },
  });
  await prisma.tournament.deleteMany({
    where: { OR: [{ source: null }, { source: '' }] },
  });
  await prisma.lobbyParticipant.deleteMany();
  await prisma.lobby.deleteMany();
  await prisma.event.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.karmaEvent.deleteMany();
  await prisma.profile.deleteMany();

  const ids = {
    marek: randomUUID(),
    lucia: randomUUID(),
    peter: randomUUID(),
    jana: randomUUID(),
    tomas: randomUUID(),
    eva: randomUUID(),
    roman: randomUUID(),
    admin: randomUUID(),
  };

  await prisma.profile.upsert({
    where: { id: SHOWCASE.organizerId },
    create: {
      id: SHOWCASE.organizerId,
      email: 'showcase-organizer@sportsync.app',
      username: 'apex_elite',
      fullName: 'Roman Sokol',
      role: Role.VENUE_OWNER,
      city: 'Bratislava',
      latitude: BA.lat,
      longitude: BA.lng,
    },
    update: {
      city: 'Bratislava',
      latitude: BA.lat,
      longitude: BA.lng,
    },
  });

  await prisma.profile.createMany({
    data: [
      { id: ids.marek, email: 'marek@sportsync.app', username: 'marek', fullName: 'Marek Vlha', role: Role.PLAYER, city: 'Bratislava', latitude: 48.152, longitude: 17.11 },
      { id: ids.lucia, email: 'lucia@sportsync.app', username: 'lucia', fullName: 'Lucia Hrabovská', role: Role.PLAYER, city: 'Bratislava', latitude: 48.14, longitude: 17.09 },
      { id: ids.peter, email: 'peter@sportsync.app', username: 'peter', fullName: 'Peter Kováč', role: Role.PLAYER, city: 'Bratislava', latitude: 48.16, longitude: 17.13 },
      { id: ids.jana, email: 'jana@sportsync.app', username: 'jana', fullName: 'Jana Bieliková', role: Role.PLAYER, city: 'Bratislava', latitude: 48.145, longitude: 17.12, seasonPts: 410 },
      { id: ids.tomas, email: 'tomas@sportsync.app', username: 'tomas', fullName: 'Tomáš Urban', role: Role.PLAYER, city: 'Senec', latitude: 48.219, longitude: 17.4 },
      { id: ids.eva, email: 'eva@sportsync.app', username: 'eva', fullName: 'Eva Mrázová', role: Role.COACH, city: 'Trnava', latitude: 48.3774, longitude: 17.5883 },
      { id: ids.roman, email: 'roman@sportsync.app', username: 'roman', fullName: 'Roman Sokol', role: Role.VENUE_OWNER, city: 'Bratislava', latitude: BA.lat, longitude: BA.lng },
      // ADMIN role must be assigned manually in Supabase profiles.role for production users.
      { id: ids.admin, email: 'admin@sportsync.app', username: 'admin', fullName: 'SportSync Admin', role: Role.ADMIN, city: 'Bratislava', latitude: BA.lat, longitude: BA.lng },
    ],
  });

  const apexArena = await prisma.venue.create({
    data: {
      ownerId: ids.roman,
      name: 'Apex Arena',
      description: 'Premium indoor padel & tennis courts in the city centre.',
      sports: ['PADEL', 'TENNIS', 'SQUASH'],
      address: 'Račianska 44, Bratislava',
      city: 'Bratislava',
      latitude: BA.lat,
      longitude: BA.lng,
      amenities: { parking: true, showers: true, proShop: true, floodlights: true },
      openingHours: { mon_fri: '06:00-23:00', sat_sun: '08:00-22:00' },
      verified: true,
    },
  });

  // Official venue event starting soon, 1 spot short of capacity — good
  // "Mercenary +1" candidate once that feed is built on a later screen.
  const padelTonight = await prisma.event.create({
    data: {
      type: 'official',
      status: 'open',
      organizerId: ids.roman,
      venueId: apexArena.id,
      sport: 'PADEL',
      title: 'Padel Night — Apex Arena',
      description: 'Doubles session at Apex Arena, court 2.',
      city: 'Bratislava',
      latitude: BA.lat,
      longitude: BA.lng,
      startsAt: inHours(0.75),
      capacity: 4,
      registeredCount: 3,
    },
  });
  void padelTonight;

  // High-profile "Featured" event for the homepage hero card — venue-less,
  // relies on its own latitude/longitude (no venueId).
  await prisma.event.create({
    data: {
      type: 'official',
      status: 'open',
      organizerId: ids.roman,
      sport: 'RUNNING',
      title: 'City Endurance 10K',
      description: 'Urban Circuit championship finale — 10,000€ prize pool.',
      city: 'Bratislava',
      latitude: 48.1439,
      longitude: 17.1097,
      price: 15,
      capacity: 500,
      registeredCount: 214,
      startsAt: inHours(24 * 10),
      coverUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBScCz_XN-hwcP1uTkBBIwIUgxVEpzZ8beoSLm_hOO2-DJYQFMucHMte6lXc7cCGS9AO75kKU5nRJs5bYuarEtTV0WyPv0esT0C2HfFvx_peZqaCZyzisGekMCLjVccR04kKKqbAaWEjuwWQxUi9gI-oB-s5eM2ozZLb6SKsGb45RSCrjAxGYCKua465NIbFQOa7vZq1Slt08_SYYUXkc3GX-qKxwNsweOitVgOBUPxtEIuDiQD_RZ-TKBCrNrqQbt-viw6G1N7h_0',
    },
  });

  // Far-away official event (~48km) — exercises the 50km fallback divider.
  await prisma.event.create({
    data: {
      type: 'official',
      status: 'open',
      organizerId: ids.roman,
      sport: 'SQUASH',
      title: 'Squash Open Court — Trnava',
      city: 'Trnava',
      latitude: 48.3774,
      longitude: 17.5883,
      startsAt: inHours(30),
      capacity: 2,
      registeredCount: 0,
    },
  });

  // Community match (Lobby), hosted by a PLAYER — no venue attached.
  const tennisLobby = await prisma.lobby.create({
    data: {
      hostId: ids.jana,
      sport: 'TENNIS',
      format: 'singles',
      spotsTotal: 2,
      city: 'Bratislava',
      scheduledAt: inHours(18),
      latitude: 48.17,
      longitude: 17.06,
    },
  });
  await prisma.lobbyParticipant.create({ data: { lobbyId: tennisLobby.id, userId: ids.jana } });

  // Community match short one player + Split-Pay enabled — this is the
  // canonical "Mercenary +1" scenario (mercenaryMode: true, 3/4 filled).
  const padelLobby = await prisma.lobby.create({
    data: {
      hostId: ids.peter,
      venueId: apexArena.id,
      sport: 'PADEL',
      format: 'doubles',
      spotsTotal: 4,
      splitPay: true,
      costPerPlayer: 8,
      mercenaryMode: true,
      city: 'Bratislava',
      scheduledAt: inHours(1),
      latitude: BA.lat,
      longitude: BA.lng,
    },
  });
  await prisma.lobbyParticipant.createMany({
    data: [ids.peter, ids.marek, ids.lucia].map((userId) => ({
      lobbyId: padelLobby.id,
      userId,
      paymentStatus: 'paid',
    })),
  });

  // Tournaments come from scrapers only (e.g. arena-padel / aurialpadel.sk) — no demo rows.

  const lesson = await prisma.trainingLesson.create({
    data: {
      coachId: ids.eva,
      sport: 'SQUASH',
      title: 'Squash Fundamentals — Beginners',
      description: 'Footwork, grip and rally control for new players.',
      level: SkillLevel.BEGINNER,
      pricePerPerson: 20,
      capacity: 4,
      bookedCount: 1,
      durationMinutes: 60,
      startsAt: inHours(20),
      status: LessonStatus.SCHEDULED,
    },
  });
  await prisma.trainingLessonBooking.create({
    data: { lessonId: lesson.id, userId: ids.tomas, status: BookingStatus.BOOKED },
  });

  // Karma ledger — profiles.karmaScore is derived by the `sync_karma_score`
  // trigger the moment each row below is inserted, so we never set the
  // column directly.
  await prisma.karmaEvent.createMany({
    data: [
      { subjectId: ids.jana, type: 'EVENT_HOSTED', delta: 25 },
      { subjectId: ids.jana, type: 'EVENT_JOINED', delta: 10 },
      { subjectId: ids.jana, type: 'TOURNAMENT_JOINED', delta: 15 },
      { subjectId: ids.marek, type: 'EVENT_JOINED', delta: 10 },
      { subjectId: ids.marek, type: 'MERCENARY_ACCEPTED', delta: 20, actorId: ids.peter },
      { subjectId: ids.lucia, type: 'EVENT_JOINED', delta: 10 },
      { subjectId: ids.lucia, type: 'TOURNAMENT_JOINED', delta: 15 },
      { subjectId: ids.peter, type: 'EVENT_HOSTED', delta: 25 },
      { subjectId: ids.peter, type: 'MERCENARY_CALLED', delta: 5 },
      { subjectId: ids.roman, type: 'VENUE_VERIFIED', delta: 50 },
      { subjectId: ids.eva, type: 'LESSON_PUBLISHED', delta: 15 },
      { subjectId: ids.tomas, type: 'LESSON_BOOKED', delta: 5 },
    ],
  });

  await seedShowcaseVenue(prisma);
  const bratislavaVenues = await seedBratislavaVenues(prisma, SHOWCASE.organizerId);
  await seedShowcaseEvent(prisma);
  await seedShowcaseEventExamples(prisma, SHOWCASE.organizerId);
  // Showcase tournament skipped — live list is scraper-only (aurialpadel.sk).
  await seedShowcaseLobby(prisma);
  await seedShowcaseTrainer(prisma);
  await seedProfileSuccess(prisma, ids.jana);
  await seedProfileFriends(prisma, ids.jana);

  console.log('Seed complete:');
  console.log('  showcase: fixed IDs — open /demo for detail page links');
  console.log(`    venue:      /venues/${SHOWCASE.venueId}`);
  console.log(`    event:      /events`);
  console.log(`    lobby:      /lobby/${SHOWCASE.lobbyId}`);
  console.log(`    trainer:    /trainers/${SHOWCASE.coachId}`);
  console.log('  profiles: 8 (PLAYER x5, COACH x1, VENUE_OWNER x1, ADMIN x1) — demo data, not real auth users');
  console.log('  admin: admin@sportsync.app (Role.ADMIN — assign manually in Supabase for production login)');
  console.log('  venue: Apex Arena (Bratislava, owned by Roman Sokol)');
  console.log(`  bratislava venues: ${bratislavaVenues.inserted} inserted (${BRATISLAVA_VENUES_INVENTORY.length} in inventory)`);
  console.log('  events: 3 official (one starting in 45 min, one 10K "Featured" race, one ~48km away in Trnava)');
  console.log('  showcase events: Bratislava Marathon 2026 (official), Sobotný padel s deťmi (community)');
  console.log('  lobbies: 2 community matches (one Split-Pay + Mercenary +1 candidate, 3/4 filled)');
  console.log('  tournaments: scraper-only (run scrape:events / cron) — no seed demos');
  console.log('  training lesson: Squash Fundamentals (1 booking)');
  console.log('  profile success: Jana goals (gym streak + padel matches) + marathon finisher #1250/12550');
  console.log('  karma events: 12 (profiles.karmaScore derived automatically via DB trigger)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
