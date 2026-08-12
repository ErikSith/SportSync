/**
 * Fixed UUIDs for illustrative demo records seeded by tab subagents.
 * Stable IDs keep showcase URLs bookmarkable across re-seeds.
 *
 * Organizer/host must be a real `auth.users` row — demo entities use the
 * signed-up account below (update if you seed on another project).
 */
export const SHOWCASE_ORGANIZER_ID = '9b4a5e5a-2818-49b1-923b-869924e3c3f4';
export const SHOWCASE_HOST_ID = '9b4a5e5a-2818-49b1-923b-869924e3c3f4';

export const SHOWCASE = {
  organizerId: SHOWCASE_ORGANIZER_ID,
  hostId: SHOWCASE_HOST_ID,
  /** Real Aurial Padel Bratislava (Bajkalská) — no fictional Apex venue. */
  venueId: '003edcb7-dc09-4d0a-8137-a656e36680aa',
  tournamentId: '00000000-0000-4000-a000-000000000201',
  eventId: '00000000-0000-4000-a000-000000000301',
  lobbyId: '00000000-0000-4000-a000-000000000401',
  coachId: '00000000-0000-4000-a000-000000000501',
} as const;

export const SHOWCASE_BA = { lat: 48.1486, lng: 17.1077 };

export interface ShowcaseCard {
  id: string;
  tab: string;
  title: string;
  subtitle: string;
  href: string;
  icon: string;
  badge: string;
}

export const SHOWCASE_CARDS: ShowcaseCard[] = [
  {
    id: SHOWCASE.venueId,
    tab: 'Venues',
    title: 'Aurial Padel Bratislava',
    subtitle: 'Real padel centre on Bajkalská — courts, booking, upcoming play',
    href: `/venues/${SHOWCASE.venueId}`,
    icon: 'stadium',
    badge: 'ELITE VERIFIED',
  },
  {
    id: 'tournaments-live',
    tab: 'Tournaments',
    title: 'Aurial Padel turnaje',
    subtitle: 'Live scraped from aurialpadel.sk — registration open',
    href: '/tournaments',
    icon: 'emoji_events',
    badge: 'LIVE SCRAPE',
  },
  {
    id: SHOWCASE.eventId,
    tab: 'Events',
    title: 'Midnight Padel Masters',
    subtitle: 'Official venue event — capacity bar, organizer, register CTA',
    href: `/events/${SHOWCASE.eventId}`,
    icon: 'event',
    badge: 'ACTIVE',
  },
  {
    id: SHOWCASE.lobbyId,
    tab: 'Lobby',
    title: 'Elite Doubles — Mercenary +1',
    subtitle: 'Community match — roster, split-pay, join/leave actions',
    href: `/lobby/${SHOWCASE.lobbyId}`,
    icon: 'groups',
    badge: 'LIVE',
  },
  {
    id: SHOWCASE.coachId,
    tab: 'Trainers',
    title: 'Marcus Vance',
    subtitle: 'Elite strength coach — philosophy, credentials, book sessions',
    href: `/trainers/${SHOWCASE.coachId}`,
    icon: 'school',
    badge: 'ELITE CERTIFIED',
  },
];
