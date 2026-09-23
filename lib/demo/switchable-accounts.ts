/**
 * Demo accounts available for one-tap switching on /profile + /manage.
 * Accounts with `password` sign in directly; others restore a saved session.
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

/** localStorage map of email → { access_token, refresh_token }. */
export const SAVED_SESSIONS_KEY = 'sportsync_saved_auth_sessions';

/** While testing: never show a password form — restore session or fail quietly. */
export const DEMO_SWITCH_SKIP_PASSWORD_PROMPT = true;
