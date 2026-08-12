import type { LobbyCardData } from '@/lib/data/lobbies';
import type { LobbyStackCardData, MatchCardData, SkillLevel, StackLobbyType } from '@/types/lobby';
import { LobbyType } from '@/types/lobby';

const SKILL_EN: Record<SkillLevel, string> = {
  NOVICE: 'Novice',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  MEDIUM: 'Medium',
};

const DEFAULT_COVERS: Record<string, string> = {
  padel:
    'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=900&h=700&fit=crop',
  tennis:
    'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=900&h=700&fit=crop',
  futbal:
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&h=700&fit=crop',
  football:
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&h=700&fit=crop',
  default:
    'https://images.unsplash.com/photo-1461896836934-ffe607ba6851?w=900&h=700&fit=crop',
};

function coverForSport(sport: string, coverUrl?: string | null): string | null {
  if (coverUrl) return coverUrl;
  const key = sport.toLowerCase();
  for (const [k, url] of Object.entries(DEFAULT_COVERS)) {
    if (key.includes(k)) return url;
  }
  return DEFAULT_COVERS.default ?? null;
}

function skillFromElo(elo: number | null): string {
  if (elo === null) return 'Open';
  if (elo >= 1600) return 'Elite';
  if (elo >= 1400) return 'Advanced';
  if (elo >= 1200) return 'Intermediate';
  return 'Novice';
}

function formatDateLabel(date: Date): string {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startTarget.getTime() - startToday.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function inferStackTypeFromMatch(type: LobbyType): StackLobbyType {
  if (type === LobbyType.TEAM_VS_TEAM) return 'TEAM_CHALLENGE';
  if (type === LobbyType.RECURRING_SQUAD) return 'RECURRING';
  return 'NEED_PLAYER';
}

export function matchCardToStackCard(match: MatchCardData, cityFallback = 'Bratislava'): LobbyStackCardData {
  const openSlots = Math.max(0, match.playersTotal - match.playersFilled);
  return {
    id: match.id,
    sport: match.sport,
    title: match.title,
    lobbyType: inferStackTypeFromMatch(match.type),
    dateLabel: match.dateLabel === 'Dnes' ? 'Today' : match.dateLabel,
    timeLabel: match.timeLabel,
    skillLabel: SKILL_EN[match.skillLevel] ?? match.skillLevel,
    venueName: match.venueName,
    city: match.city ?? cityFallback,
    playersFilled: match.playersFilled,
    playersTotal: match.playersTotal,
    openSlots,
    roster: match.roster,
    coverUrl: coverForSport(match.sport, match.coverUrl),
    has3dEffect: true,
    href: match.id.startsWith('match-') ? `/lobby/create` : `/lobby/${match.id}`,
  };
}

export function lobbyCardToStackCard(lobby: LobbyCardData): LobbyStackCardData {
  const openSlots = Math.max(0, lobby.spotsTotal - lobby.spotsFilled);
  const lobbyType: StackLobbyType =
    lobby.lobbyType ??
    (lobby.mercenaryMode || openSlots === 1
      ? 'NEED_PLAYER'
      : lobby.format.toLowerCase().includes('team')
        ? 'TEAM_CHALLENGE'
        : openSlots > 0
          ? 'NEED_PLAYER'
          : 'RECURRING');

  return {
    id: lobby.id,
    sport: lobby.sport,
    title: lobby.title ?? lobby.sport,
    lobbyType,
    dateLabel: formatDateLabel(lobby.scheduledAt),
    timeLabel: formatTimeLabel(lobby.scheduledAt),
    skillLabel: skillFromElo(lobby.skillLevel),
    venueName: lobby.venueName ?? lobby.city,
    city: lobby.city,
    playersFilled: lobby.spotsFilled,
    playersTotal: lobby.spotsTotal,
    openSlots,
    roster: lobby.participants.map((p) => ({
      id: p.id,
      name: p.name,
      image: p.avatarUrl,
    })),
    coverUrl: coverForSport(lobby.sport, lobby.coverUrl),
    has3dEffect: lobby.has3dEffect,
    href: `/lobby/${lobby.id}`,
  };
}

export function statusBadgeLabel(card: LobbyStackCardData): string {
  if (card.lobbyType === 'TEAM_CHALLENGE') return 'TEAM CHALLENGE';
  if (card.lobbyType === 'RECURRING') return 'RECURRING';
  const n = card.openSlots;
  if (n <= 0) return 'FULL';
  if (n === 1) return 'NEED 1 PLAYER';
  return `NEED ${n} PLAYERS`;
}
