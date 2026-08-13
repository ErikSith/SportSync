import { formatLobbyLabel } from '@/lib/constants/lobbies';
import { sportDisplayLabel } from '@/lib/constants/sports';
import type { LobbyDetailData } from '@/lib/data/lobbies';
import { lobbyTierLabel } from '@/lib/utils/lobby';
import {
  LOBBY_TYPE_LABELS,
  LobbyType,
  SKILL_LEVEL_LABELS,
  type CreateLobbyDraft,
  type MatchCardData,
  type PlayerAvatar,
} from '@/types/lobby';

const LOBBY_TYPE_COPY: Record<string, string> = {
  NEED_PLAYER: 'Hľadám hráča (+1)',
  TEAM_CHALLENGE: 'Tím vs tím',
  RECURRING: 'Pravidelná partia',
};

export const LOBBY_PREVIEW_DEFAULT_COVER =
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80';

export interface LobbyPreviewData {
  id: string;
  sport: string;
  title: string;
  typeLabel: string;
  formatLabel: string;
  dateLabel: string;
  timeLabel: string;
  venueName: string;
  city: string;
  spotsFilled: number;
  spotsTotal: number;
  skillLabel: string;
  coverUrl: string | null;
  hostName: string | null;
  roster: PlayerAvatar[];
  isHost: boolean;
  isJoined: boolean;
  mercenaryMode: boolean;
  status: string;
  venueId: string | null;
  websiteUrl: string | null;
  distanceKm: number | null;
  priceLabel: string | null;
}

function statusFromSpots(filled: number, total: number, status?: string): string {
  if (status === 'full' || filled >= total) return 'full';
  if (status === 'live' || filled === total - 1) return 'live';
  return status || 'open';
}

export function matchCardToLobbyPreview(match: MatchCardData): LobbyPreviewData {
  return {
    id: match.id,
    sport: match.sport,
    title: match.title,
    typeLabel: LOBBY_TYPE_LABELS[match.type],
    formatLabel: match.sportFormat?.replace(/[()]/g, '') || '',
    dateLabel: match.dateLabel,
    timeLabel: match.timeLabel,
    venueName: match.venueName,
    city: match.city ?? '',
    spotsFilled: match.playersFilled,
    spotsTotal: match.playersTotal,
    skillLabel: SKILL_LEVEL_LABELS[match.skillLevel],
    coverUrl: match.coverUrl ?? null,
    hostName: match.roster[0]?.name ?? null,
    roster: match.roster,
    isHost: false,
    isJoined: false,
    mercenaryMode: match.type === LobbyType.SINGLE_PLAYER_1,
    status: statusFromSpots(match.playersFilled, match.playersTotal),
    venueId: null,
    websiteUrl: null,
    distanceKm: match.distanceKm > 0 ? match.distanceKm : null,
    priceLabel:
      match.pricePerPersonEur != null && match.pricePerPersonEur > 0
        ? `€${match.pricePerPersonEur}`
        : 'Free',
  };
}

export function lobbyDetailToPreview(lobby: LobbyDetailData): LobbyPreviewData {
  const typeLabel = lobby.lobbyType
    ? (LOBBY_TYPE_COPY[lobby.lobbyType] ?? lobby.lobbyType)
    : formatLobbyLabel(lobby.format);
  const headline =
    lobby.title?.trim() ||
    `${sportDisplayLabel(lobby.sport)} · ${formatLobbyLabel(lobby.format)}`;

  return {
    id: lobby.id,
    sport: lobby.sport,
    title: headline,
    typeLabel,
    formatLabel: formatLobbyLabel(lobby.format),
    dateLabel: lobby.scheduledAt.toLocaleDateString('sk-SK', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
    timeLabel: lobby.scheduledAt.toLocaleTimeString('sk-SK', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    venueName: lobby.venue?.name ?? lobby.city,
    city: lobby.venue
      ? `${lobby.venue.city}${lobby.venue.address ? ` · ${lobby.venue.address}` : ''}`
      : lobby.city,
    spotsFilled: lobby.spotsFilled,
    spotsTotal: lobby.spotsTotal,
    skillLabel: lobbyTierLabel(lobby.skillLevel),
    coverUrl: null,
    hostName: lobby.host.name,
    roster: lobby.participants.map((p) => ({
      id: p.id,
      name: p.name,
      image: p.avatarUrl,
    })),
    isHost: lobby.isHost,
    isJoined: lobby.isJoined,
    mercenaryMode: lobby.mercenaryMode,
    status: lobby.status,
    venueId: lobby.venue?.id ?? null,
    websiteUrl: lobby.venue?.websiteUrl ?? null,
    distanceKm: null,
    priceLabel: lobby.costPerPlayer > 0 ? `€${lobby.costPerPlayer}` : 'Free',
  };
}

export function draftToLobbyPreview(
  draft: CreateLobbyDraft,
  lobbyId: string,
  city: string,
): LobbyPreviewData {
  const typeLabel = draft.type ? LOBBY_TYPE_LABELS[draft.type] : 'Lobby';
  const spotsTotal = Math.min(10, Math.max(2, draft.spotsNeeded + 1));
  const dateLabel = draft.date
    ? (() => {
        const parts = draft.date.split('-').map(Number);
        const y = parts[0];
        const m = parts[1];
        const d = parts[2];
        if (y == null || m == null || d == null) return draft.date;
        return new Date(y, m - 1, d).toLocaleDateString('sk-SK', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        });
      })()
    : '—';

  return {
    id: lobbyId,
    sport: draft.sport,
    title: `${draft.sport} · ${draft.venue}`.slice(0, 80),
    typeLabel,
    formatLabel: '',
    dateLabel,
    timeLabel: draft.time || '—',
    venueName: draft.venue,
    city,
    spotsFilled: 1,
    spotsTotal,
    skillLabel: SKILL_LEVEL_LABELS[draft.skillLevel],
    coverUrl: null,
    hostName: 'Ty',
    roster: [],
    isHost: true,
    isJoined: true,
    mercenaryMode: draft.type === LobbyType.SINGLE_PLAYER_1,
    status: 'open',
    venueId: draft.venueId,
    websiteUrl: null,
    distanceKm: null,
    priceLabel: 'Free',
  };
}

export function previewStatusBadge(
  status: string,
  spotsFilled: number,
  spotsTotal: number,
): { label: string; live: boolean; className: string } {
  if (status === 'full' || spotsFilled >= spotsTotal) {
    return {
      label: 'Full',
      live: false,
      className: 'bg-black/50 text-zinc-300 border border-white/15',
    };
  }
  if (status === 'live' || spotsFilled === spotsTotal - 1) {
    return {
      label: 'Live',
      live: true,
      className: 'bg-error/90 text-on-error',
    };
  }
  return {
    label: 'Open',
    live: true,
    className: 'bg-secondary/90 text-on-secondary',
  };
}
