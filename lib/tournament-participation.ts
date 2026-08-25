import type { EventCardData, ParticipationMode } from '@/lib/data/events';
import type { TournamentCardData } from '@/lib/data/tournaments';
import { titleIsOutsideBratislava } from '@/lib/cities';
import { titleLooksLikeHeadToHeadFixture } from '@/lib/participation/fixture-match';

type TournamentParticipationFields = {
  name: string;
  description: string | null;
  status: string;
  ticketUrl: string | null;
  sourceUrl: string | null;
  source?: string | null;
};

/** Pro clubs / arenas whose listings are tickets, not player entry. */
const SPECTATOR_SOURCES = new Set([
  'sk-slovan',
  'hc-slovan',
  'gopass-arena',
  'subdeck',
]);

/** Real ticketing checkout — not a venue registration form stored in ticket_url. */
const TICKET_CHECKOUT =
  /ticketportal|goout\.net|predpredaj\.zoznam|\/listky\/|vstupenk|dc-vstupenk/i;

const WATCH_ONLY_COPY =
  /vstupenk|predpredaj|div[aá]ci|div[aá]k|\bspectator\b|\bsledova[tť]\b|\bwatch\s+from\b/i;

const PLAYER_ENTRY_COPY =
  /prihl[aá][sš]|registr|uz[aá]vierka|štartovn[eé]|startovne|entry\s*fee|\/tournament\/|\/registracie\/|\/turnaj/i;

function haystack(t: TournamentParticipationFields): string {
  return `${t.name} ${t.description ?? ''} ${t.sourceUrl ?? ''} ${t.ticketUrl ?? ''}`.toLowerCase();
}

function urlsOf(t: TournamentParticipationFields): string {
  return `${t.sourceUrl ?? ''} ${t.ticketUrl ?? ''}`.toLowerCase();
}

/**
 * Hrať = cups you can enter as a player (open registration, amateur brackets).
 * Sledovať = watch-only: tickets, stands, pro spectacles.
 *
 * Scrapers often put the registration page into `ticketUrl` — that is not a
 * spectator signal by itself.
 */
export function tournamentParticipationMode(t: TournamentParticipationFields): ParticipationMode {
  if (titleLooksLikeHeadToHeadFixture(t.name)) return 'spectator';

  if (t.source && SPECTATOR_SOURCES.has(t.source)) return 'spectator';

  const urls = urlsOf(t);
  if (TICKET_CHECKOUT.test(urls)) return 'spectator';

  const hay = haystack(t);
  const canEnter = PLAYER_ENTRY_COPY.test(hay) || PLAYER_ENTRY_COPY.test(urls);
  if (WATCH_ONLY_COPY.test(hay) && !canEnter) return 'spectator';

  return 'participate';
}

export function applyTournamentParticipationFilter<T extends TournamentParticipationFields>(
  items: T[],
  mode: ParticipationMode,
): T[] {
  return items.filter((t) => tournamentParticipationMode(t) === mode);
}

const CUP_LIKE =
  /turnaj|tournament|\bcup\b|davis|fed\s*cup|championship|trophy|majstrovst|vstupenk/i;

/** Spectator events that belong on /tournaments Sledovať (Davis Cup tickets, etc.). */
export function eventLooksLikeWatchOnlyCup(event: EventCardData): boolean {
  if (event.participationMode !== 'spectator') return false;
  if (titleLooksLikeHeadToHeadFixture(event.title)) return true;
  const hay = `${event.title} ${event.description ?? ''} ${event.sourceUrl ?? ''} ${event.ticketUrl ?? ''}`;
  return CUP_LIKE.test(hay);
}

export function spectatorEventToTournamentCard(event: EventCardData): TournamentCardData {
  return {
    id: event.id,
    name: event.title,
    description: event.description,
    sport: event.sport,
    format: 'SINGLE_ELIMINATION',
    status: 'REGISTRATION_OPEN',
    entryFee: event.price,
    currentParticipants: event.registeredCount,
    maxParticipants: event.maxParticipants ?? event.capacity ?? 0,
    coverUrl: event.coverUrl,
    startsAt: event.startsAt,
    endsAt: null,
    registrationDeadline: null,
    venueId: event.venueId,
    venueName: event.venueName,
    venueCity: event.city,
    venueAddress: null,
    venueLatitude: event.latitude,
    venueLongitude: event.longitude,
    skillLevelMin: null,
    skillLevelMax: null,
    source: event.source,
    sourceUrl: event.sourceUrl,
    ticketUrl: event.ticketUrl,
    isAggregated: event.isAggregated || Boolean(event.source),
    forKids: event.forKids,
    forWomen: event.forWomen,
  };
}

export function mergeWatchOnlyCups(
  tournaments: TournamentCardData[],
  spectatorEvents: EventCardData[],
): TournamentCardData[] {
  const seen = new Set(
    tournaments.map((t) => `${t.name.trim().toLowerCase()}|${t.startsAt.toISOString().slice(0, 10)}`),
  );
  const extra: TournamentCardData[] = [];
  for (const event of spectatorEvents) {
    if (!eventLooksLikeWatchOnlyCup(event)) continue;
    if (titleIsOutsideBratislava(event.title)) continue;
    const card = spectatorEventToTournamentCard(event);
    const key = `${card.name.trim().toLowerCase()}|${card.startsAt.toISOString().slice(0, 10)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    extra.push(card);
  }
  if (extra.length === 0) return tournaments;
  return [...tournaments, ...extra].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}
