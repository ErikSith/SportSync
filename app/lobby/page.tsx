import { Suspense } from 'react';
import { getPageViewer } from '@/lib/auth/viewer';
import { getVenuesForLobbyPicker } from '@/lib/data/homepage';
import {
  getCityLobbyFeed,
  getNearbyLobbyFeed,
  type LobbyCardData,
} from '@/lib/data/lobbies';
import { getMyGroups } from '@/lib/data/sport-groups';
import { MOCK_MATCH_CARDS } from '@/lib/mockLobbyData';
import type { MatchCardData, SkillLevel } from '@/types/lobby';
import { LobbyType } from '@/types/lobby';
import { LobbyPageView } from '@/components/lobby/LobbyPageView';
import { PlayerFeedFilterHydrator } from '@/components/home/HomeFeedFilterButton';
import { BrandAppBar } from '@/components/shared/BrandAppBar';

function skillFromElo(elo: number | null): SkillLevel {
  if (elo === null) return 'INTERMEDIATE';
  if (elo >= 1600) return 'ADVANCED';
  if (elo >= 1400) return 'ADVANCED';
  if (elo >= 1200) return 'INTERMEDIATE';
  return 'NOVICE';
}

function sportIcon(sport: string): MatchCardData['sportIcon'] {
  const s = sport.toLowerCase();
  if (s.includes('tenis') || s.includes('tennis')) return 'tennis';
  if (s.includes('futbal') || s.includes('football') || s.includes('soccer')) return 'football';
  if (s.includes('basket')) return 'basketball';
  return 'padel';
}

function lobbyToMatchCard(lobby: LobbyCardData): MatchCardData {
  const open = Math.max(0, lobby.spotsTotal - lobby.spotsFilled);
  const type: LobbyType =
    lobby.lobbyType === 'TEAM_CHALLENGE'
      ? LobbyType.TEAM_VS_TEAM
      : lobby.lobbyType === 'RECURRING'
        ? LobbyType.RECURRING_SQUAD
        : open === 1 || lobby.mercenaryMode
          ? LobbyType.SINGLE_PLAYER_1
          : LobbyType.SINGLE_PLAYER_1;

  const scheduled = lobby.scheduledAt;
  const dateLabel = scheduled.toLocaleDateString('sk-SK', { weekday: 'short', day: 'numeric' });
  const timeLabel = scheduled.toLocaleTimeString('sk-SK', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return {
    id: lobby.id,
    type,
    title: lobby.title ?? lobby.sport,
    sport: lobby.sport,
    dateLabel,
    timeLabel,
    venueName: lobby.venueName ?? lobby.city,
    city: lobby.city,
    distanceKm: lobby.distanceKm,
    playersFilled: lobby.spotsFilled,
    playersTotal: lobby.spotsTotal,
    skillLevel: skillFromElo(lobby.skillLevel),
    pricePerPersonEur: lobby.costPerPlayer > 0 ? lobby.costPerPlayer : null,
    roster: lobby.participants.map((p) => ({
      id: p.id,
      name: p.name,
      image: p.avatarUrl,
    })),
    ctaLabel:
      type === LobbyType.TEAM_VS_TEAM
        ? 'Prijať výzvu (Challenge)'
        : type === LobbyType.RECURRING_SQUAD
          ? 'Požiadať o vstup do Squadu'
          : 'Pripojiť sa (1-Klik)',
    sportIcon: sportIcon(lobby.sport),
    iconAccent: 'orange',
    coverUrl: lobby.coverUrl,
    paymentDisclaimer: 'Rezervácia kurtu a platba priamo na športovisku.',
    teamName: type === LobbyType.TEAM_VS_TEAM ? lobby.title ?? lobby.hostName : undefined,
    challengeTerms:
      type === LobbyType.TEAM_VS_TEAM ? 'Kurt rezervovaný • Náklady napoly' : undefined,
  };
}

/**
 * Lobby / Matchmaking — sport hub → sport feed + My Crew.
 * Global nav: ThumbButton (no bottom bar / hamburger).
 */
export default async function LobbyPage() {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return (
      <main className="mx-auto max-w-lg px-4 pt-24 text-center">
        <p className="text-sm text-zinc-400">Nastavujeme tvoj profil…</p>
      </main>
    );
  }

  const { profile } = viewer;
  const city = profile.city ?? 'Bratislava';
  const hasGps = profile.latitude !== null && profile.longitude !== null;
  const venues = await getVenuesForLobbyPicker(city);

  let dbLobbies: LobbyCardData[] = [];
  try {
    if (hasGps) {
      const feed = await getNearbyLobbyFeed({
        lat: profile.latitude as number,
        lng: profile.longitude as number,
        profileId: profile.id,
      });
      dbLobbies = feed.lobbies;
    } else {
      dbLobbies = await getCityLobbyFeed(city, profile.id);
    }
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[lobby.page] feed failed', err);
    }
  }

  const initialMatches =
    dbLobbies.length > 0 ? dbLobbies.map(lobbyToMatchCard) : MOCK_MATCH_CARDS;

  let groups: Awaited<ReturnType<typeof getMyGroups>> = [];
  try {
    groups = await getMyGroups(profile.id);
  } catch {
    groups = [];
  }

  return (
    <>
      <Suspense fallback={null}>
        <PlayerFeedFilterHydrator />
      </Suspense>
      <BrandAppBar accent="primary" />
      <LobbyPageView
        city={city}
        venues={venues}
        initialMatches={initialMatches}
        groups={groups}
      />
    </>
  );
}
