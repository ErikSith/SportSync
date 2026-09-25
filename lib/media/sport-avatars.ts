/**
 * Brand SportSync mascot covers — one avatar per feed tab × sport.
 *
 * Source of truth for new art: `/Avatars/{Tab} - Avatar/Šport {Sport}.png`
 * Served copies live under `/public/avatars/{tab}/{sport}.png`.
 *
 * When a mascot exists for tab+sport, it is the listing cover (brand identity).
 * Otherwise keep the organizer cover, or null → UI gradient.
 */

export type SportAvatarTab = 'tournament' | 'event';

/** Filenames under `/public/avatars/tournament/`. Keys = uppercase sport enum. */
const TOURNAMENT_AVATARS: Partial<Record<string, string>> = {
  PADEL: '/avatars/tournament/padel.png',
};

/** Filenames under `/public/avatars/event/`. Add as Event - Avatar assets arrive. */
const EVENT_AVATARS: Partial<Record<string, string>> = {};

const AVATARS_BY_TAB: Record<SportAvatarTab, Partial<Record<string, string>>> = {
  tournament: TOURNAMENT_AVATARS,
  event: EVENT_AVATARS,
};

export function normalizeSportAvatarKey(sport: string): string {
  return sport.trim().toUpperCase();
}

/** Public URL for a tab+sport avatar, or null if not shipped yet. */
export function sportAvatarUrl(tab: SportAvatarTab, sport: string): string | null {
  const key = normalizeSportAvatarKey(sport);
  return AVATARS_BY_TAB[tab][key] ?? null;
}

/**
 * SportSync mascot wins when shipped for this tab+sport.
 * Else organizer cover, else null (gradient).
 */
export function resolveTabCover(opts: {
  tab: SportAvatarTab;
  sport: string;
  coverUrl?: string | null;
}): string | null {
  const avatar = sportAvatarUrl(opts.tab, opts.sport);
  if (avatar) return avatar;
  const trimmed = opts.coverUrl?.trim();
  return trimmed ? trimmed : null;
}

/** True when the URL is one of our local mascot assets (studio character art). */
export function isSportAvatarUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  return url.startsWith('/avatars/');
}
