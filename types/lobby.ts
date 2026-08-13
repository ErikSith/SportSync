export enum LobbyType {
  SINGLE_PLAYER_1 = 'SINGLE_PLAYER_1',
  TEAM_VS_TEAM = 'TEAM_VS_TEAM',
  RECURRING_SQUAD = 'RECURRING_SQUAD',
}

export type StackLobbyType = 'NEED_PLAYER' | 'TEAM_CHALLENGE' | 'RECURRING';

export type SkillLevel = 'NOVICE' | 'INTERMEDIATE' | 'ADVANCED' | 'MEDIUM';

export type SportIconKind =
  | 'football'
  | 'tennis'
  | 'padel'
  | 'basketball'
  | 'squash'
  | 'running'
  | 'volleyball'
  | 'hockey';

/** Hub sport keys used for Lobby sport picker → filtered feed. */
export type LobbySportKey =
  | 'padel'
  | 'football'
  | 'tennis'
  | 'basketball'
  | 'squash'
  | 'running'
  | 'volleyball'
  | 'hockey';

export type LobbyFilterTab = 'ALL' | LobbyType;

export interface PlayerAvatar {
  id: string;
  image: string | null;
  name: string;
  level?: SkillLevel;
  role?: string;
}

/** Stack / carousel card for the redesigned Lobby feed. */
export interface LobbyStackCardData {
  id: string;
  sport: string;
  title: string;
  lobbyType: StackLobbyType;
  dateLabel: string;
  timeLabel: string;
  skillLabel: string;
  venueName: string;
  city: string;
  playersFilled: number;
  playersTotal: number;
  openSlots: number;
  roster: PlayerAvatar[];
  coverUrl: string | null;
  has3dEffect: boolean;
  href: string;
}

export interface MatchCardData {
  id: string;
  type: LobbyType;
  /** Card header title matching design labels */
  title: string;
  sport: string;
  /** Optional format suffix e.g. "(Dvojhra)" */
  sportFormat?: string;
  dateLabel: string;
  timeLabel: string;
  venueName: string;
  distanceKm: number;
  playersFilled: number;
  playersTotal: number;
  skillLevel: SkillLevel;
  pricePerPersonEur: number | null;
  /** Filled roster seats (empty slots derived from playersTotal) */
  roster: PlayerAvatar[];
  /** Team A roster for TEAM_VS_TEAM */
  teamA?: PlayerAvatar[];
  /** Empty opponent slots count for TEAM_VS_TEAM */
  teamBOpenSlots?: number;
  ctaLabel: string;
  sportIcon: SportIconKind;
  /** Accent color for the linear corner icon */
  iconAccent: 'orange' | 'lime' | 'purple';
  /** Recurring squad substitute CTA */
  substituteLabel?: string;
  recurringNote?: string;
  /** Optional hero for stack / 3D card */
  coverUrl?: string | null;
  city?: string;
  /** TEAM_VS_TEAM challenger identity */
  teamName?: string;
  teamRecord?: string;
  teamLogoUrl?: string | null;
  /** e.g. "Kurt rezervovaný • Náklady napoly" */
  challengeTerms?: string;
  /** RECURRING_SQUAD status line */
  squadStatus?: string;
  paymentDisclaimer?: string;
}

export interface CreateLobbyDraft {
  type: LobbyType | null;
  sport: string;
  date: string;
  time: string;
  venue: string;
  /** Real venues UUID when picked from catalog; null for free-text / fallback. */
  venueId: string | null;
  spotsNeeded: number;
  skillLevel: SkillLevel;
  aiPrompt: string;
  frequencyLabel: string;
}

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  NOVICE: 'Nováčik',
  INTERMEDIATE: 'Mierne pokročilý',
  ADVANCED: 'Pokročilý',
  MEDIUM: 'Stredná úroveň',
};

export const LOBBY_TYPE_LABELS: Record<LobbyType, string> = {
  [LobbyType.SINGLE_PLAYER_1]: 'Hľadám hráča (+1)',
  [LobbyType.TEAM_VS_TEAM]: 'Hľadáme súperov (Tím vs Tím)',
  [LobbyType.RECURRING_SQUAD]: 'Pravidelná partia',
};

export const EMPTY_CREATE_DRAFT: CreateLobbyDraft = {
  type: null,
  sport: 'Padel',
  date: '',
  time: '18:00',
  venue: 'Park 21',
  venueId: null,
  spotsNeeded: 1,
  skillLevel: 'INTERMEDIATE',
  aiPrompt: '',
  frequencyLabel: 'Každý pondelok 18:00',
};
