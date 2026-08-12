/** Roles allowed to create official tournaments and events (not regular players). */
export const ORGANIZER_ROLES = ['VENUE_OWNER', 'ADMIN'] as const;

/** @deprecated Use ORGANIZER_ROLES */
export const TOURNAMENT_ORGANIZER_ROLES = ORGANIZER_ROLES;

export type OrganizerRole = (typeof ORGANIZER_ROLES)[number];

/** @deprecated Use OrganizerRole */
export type TournamentOrganizerRole = OrganizerRole;

export function canAccessManageHub(role: string): boolean {
  return (ORGANIZER_ROLES as readonly string[]).includes(role);
}

export function canCreateTournament(role: string): boolean {
  return canAccessManageHub(role);
}

export function canCreateOfficialEvent(role: string): boolean {
  return canAccessManageHub(role);
}

export function organizerRoleLabel(role: string): string {
  if (role === 'ADMIN') return 'Admin';
  if (role === 'VENUE_OWNER') return 'Venue Manager';
  return role;
}
