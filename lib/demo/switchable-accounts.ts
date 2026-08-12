/**
 * Demo accounts available for one-tap switching on /profile.
 * Only accounts with `password` can be signed into directly;
 * others are restored via a saved session snapshot.
 */
export interface SwitchableAccount {
  id: string;
  email: string;
  label: string;
  roleLabel: string;
  /** Present only for seeded demo accounts (never commit real user passwords). */
  password?: string;
}

export const SWITCHABLE_ACCOUNTS: SwitchableAccount[] = [
  {
    id: 'erik-player',
    email: 'erik.sith9@gmail.com',
    label: 'Erik',
    roleLabel: 'Player',
  },
  {
    id: 'lena-venue',
    email: 'lena.novak@sportsync.app',
    label: 'Lena Nováková',
    roleLabel: 'Venue Owner',
    password: 'SportSyncVenue1!',
  },
];

export const SAVED_SESSION_KEY = 'sportsync_saved_auth_session';
