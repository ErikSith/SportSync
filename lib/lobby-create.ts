import { LOBBY_SPORTS, type LobbySport } from '@/lib/constants/sports';
import type { LobbyFormat } from '@/lib/constants/lobbies';
import {
  LobbyType,
  type CreateLobbyDraft,
  type SkillLevel,
} from '@/types/lobby';

const SPORT_LABEL_TO_API: Record<string, LobbySport> = {
  Padel: 'PADEL',
  Tenis: 'TENNIS',
  Tennis: 'TENNIS',
  Futbal: 'FOOTBALL',
  Football: 'FOOTBALL',
  Basketbal: 'BASKETBALL',
  Basketball: 'BASKETBALL',
  Squash: 'SQUASH',
  Running: 'RUNNING',
  Volleyball: 'VOLLEYBALL',
  Hockey: 'HOCKEY',
};

/** Map UI skill labels to approximate ELO stored on lobbies.skill_level. */
const SKILL_TO_ELO: Record<SkillLevel, number> = {
  NOVICE: 1000,
  INTERMEDIATE: 1200,
  MEDIUM: 1200,
  ADVANCED: 1500,
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function mapSportLabelToLobbySport(label: string): LobbySport | null {
  const direct = SPORT_LABEL_TO_API[label.trim()];
  if (direct) return direct;
  const upper = label.trim().toUpperCase().replace(/\s+/g, '_');
  return (LOBBY_SPORTS as readonly string[]).includes(upper)
    ? (upper as LobbySport)
    : null;
}

export function mapLobbyTypeToFormat(type: LobbyType): LobbyFormat {
  switch (type) {
    case LobbyType.SINGLE_PLAYER_1:
      return 'singles';
    case LobbyType.TEAM_VS_TEAM:
      return 'doubles';
    case LobbyType.RECURRING_SQUAD:
      return 'group';
  }
}

export function mapLobbyTypeToStackType(
  type: LobbyType,
): 'NEED_PLAYER' | 'TEAM_CHALLENGE' | 'RECURRING' {
  switch (type) {
    case LobbyType.SINGLE_PLAYER_1:
      return 'NEED_PLAYER';
    case LobbyType.TEAM_VS_TEAM:
      return 'TEAM_CHALLENGE';
    case LobbyType.RECURRING_SQUAD:
      return 'RECURRING';
  }
}

export function skillLevelToElo(level: SkillLevel): number {
  return SKILL_TO_ELO[level];
}

export function isVenueUuid(id: string | null | undefined): id is string {
  return Boolean(id && UUID_RE.test(id));
}

export interface CreateLobbyApiPayload {
  sport: LobbySport;
  format: LobbyFormat;
  city: string;
  scheduledAt: string;
  spotsTotal: number;
  mercenaryMode: boolean;
  venueId?: string;
  skillLevel?: number;
  lobbyType?: 'NEED_PLAYER' | 'TEAM_CHALLENGE' | 'RECURRING';
  title?: string;
}

export function buildCreateLobbyPayload(
  draft: CreateLobbyDraft,
  city: string,
): { ok: true; payload: CreateLobbyApiPayload } | { ok: false; error: string } {
  if (!draft.type) return { ok: false, error: 'Vyber typ lobby.' };

  const sport = mapSportLabelToLobbySport(draft.sport);
  if (!sport) return { ok: false, error: `Nepodporovaný šport: ${draft.sport}` };

  if (!draft.date || !draft.time) {
    return { ok: false, error: 'Vyber dátum a čas.' };
  }

  const scheduledAt = new Date(`${draft.date}T${draft.time}`);
  if (Number.isNaN(scheduledAt.getTime())) {
    return { ok: false, error: 'Neplatný dátum alebo čas.' };
  }
  if (scheduledAt <= new Date()) {
    return { ok: false, error: 'Čas musí byť v budúcnosti.' };
  }

  if (!draft.venue.trim()) {
    return { ok: false, error: 'Vyber alebo napíš športovisko.' };
  }

  const spotsTotal = Math.min(10, Math.max(2, draft.spotsNeeded + 1));

  const payload: CreateLobbyApiPayload = {
    sport,
    format: mapLobbyTypeToFormat(draft.type),
    city,
    scheduledAt: scheduledAt.toISOString(),
    spotsTotal,
    mercenaryMode: draft.type === LobbyType.SINGLE_PLAYER_1,
    skillLevel: skillLevelToElo(draft.skillLevel),
    lobbyType: mapLobbyTypeToStackType(draft.type),
    title: `${draft.sport} · ${draft.venue}`.slice(0, 80),
  };

  if (isVenueUuid(draft.venueId)) {
    payload.venueId = draft.venueId;
  }

  return { ok: true, payload };
}
