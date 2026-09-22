/**
 * Shared watch-only (Sledovať) vs join (Hrať) signals for events + tournaments.
 */

/** Sources that are always spectator (ticket arenas / clubs). */
export const ALWAYS_SPECTATOR_SOURCES = new Set([
  'sk-slovan',
  'hc-slovan',
  'gopass-arena',
  'subdeck',
]);

/** Real ticketing checkout — not a venue registration form stored in ticket_url. */
export const TICKET_CHECKOUT =
  /ticketportal|goout\.net|predpredaj\.zoznam|\/listky\/|vstupenk|dc-vstupenk|inviton|gopassarena\.sk\/e-/i;

export const WATCH_ONLY_COPY =
  /vstupenk|predpredaj|div[aá]ci|div[aá]k|\bspectator\b|\bsledova[tť]\b|\bwatch\s+from\b|k[uú]pi[tť]\s+vstupenk|globetrotters|exhib[ií]ci|show\b|spekt[aá]k/i;

export const PLAYER_ENTRY_COPY =
  /prihl[aá][sš]|uz[aá]vierka|štartovn[eé]|startovne|entry\s*fee|\/tournament\/|\/registracie\/|\/turnaj|open\s+cup|štartovné/i;

/** Soft registration words — ignored when only our aggregator boilerplate mentions them. */
export const SOFT_REGISTER = /\bregistr/i;

/** SportSync redirector notice — must not count as player-entry "registrácia". */
export const AGGREGATOR_BOILERPLATE =
  /sportsync\s+zobrazuje[\s\S]{0,200}?organiz[aá]tora\.?/gi;
