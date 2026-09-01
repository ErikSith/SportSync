import type { SportSkillsMap } from '@/lib/profile/sport-skills';

/** Client-safe profile shape (no supabase / server imports). */
export interface Profile {
  id: string;
  email: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  preferredSports: string[];
  sportSkills: SportSkillsMap;
  mercenarySports: string[];
  role: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  karmaScore: number;
  seasonPts: number;
  phoneNumber: string | null;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  is2faEnabled: boolean;
}

export interface ProfileHeroStats {
  gamesPlayed: number;
  groupsCount: number;
  levelLabel: string;
}

export interface ProfileGameStatsView {
  lobbiesHosted: number;
  lobbiesJoined: number;
  completedLobbies: number;
  tournamentRegistrations: number;
  lessonsBooked: number;
  gamesPlayed: number;
  groupsCount: number;
}

export type MatchActivityResult = 'win' | 'loss' | 'draw';

export interface MatchActivityParticipant {
  id: string;
  name: string;
  avatarUrl: string | null;
}

/** Activity card for profile UI — `createdAt` is ISO string for RSC → client. */
export interface MatchActivityCard {
  id: string;
  sport: string;
  contextType: 'lobby' | 'tournament' | 'group_session' | 'lesson';
  title: string;
  location: string | null;
  result: MatchActivityResult;
  scoreLabel: string | null;
  createdAt: string;
  participants: MatchActivityParticipant[];
}

export interface KarmaHistoryEntryView {
  id: string;
  type: string;
  delta: number;
  contextRef: string | null;
  createdAt: string;
  actorId: string | null;
  actorName: string | null;
}
