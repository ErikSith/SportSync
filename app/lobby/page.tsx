import { Suspense } from 'react';
import { getPageViewer } from '@/lib/auth/viewer';
import { getVenuesForLobbyPicker } from '@/lib/data/homepage';
import {
  getCityLobbyFeed,
  getMyLobbyCards,
  getNearbyLobbyFeed,
  mergeLobbyFeeds,
  type LobbyCardData,
} from '@/lib/data/lobbies';
import { getMyGroups } from '@/lib/data/sport-groups';
import { sportDisplayLabel } from '@/lib/constants/sports';
import type { MatchCardData, SkillLevel } from '@/types/lobby';
import { LobbyType } from '@/types/lobby';
import { sportIconAccent, sportToIconKind } from '@/components/lobby/lobby-ui';
import { LobbyPageView } from '@/components/lobby/LobbyPageView';
import { PlayerFeedFilterHydrator } from '@/components/home/HomeFeedFilterButton';
import { BrandAppBar } from '@/components/shared/BrandAppBar';

export const runtime = 'edge';

function skillFromElo(elo: number | null): SkillLevel {
  if (elo === null) return 'INTERMEDIATE';
  if (elo >= 1400) return 'ADVANCED';
  if (elo >= 1200) return 'INTERMEDIATE';
  return 'NOVICE';
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
  const sportIcon = sportToIconKind(lobby.sport, lobby.title ?? undefined);

  return {
    id: lobby.id,
    type,
    title: lobby.title ?? lobby.sport,
    sport: sportDisplayLabel(lobby.sport),
    dateLabel,
    timeLabel,
    venueName: lobby.venueName ?? lobby.city,
    venueId: lobby.venueId,
    websiteUrl: lobby.websiteUrl,
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
    sportIcon,
    iconAccent: sportIconAccent(sportIcon),
    coverUrl: lobby.coverUrl,
    paymentDisclaimer: 'Rezervácia kurtu a platba priamo na športovisku.',
    teamName: type === LobbyType.TEAM_VS_TEAM ? lobby.title ?? lobby.hostName : undefined,
    challengeTerms:
      type === LobbyType.TEAM_VS_TEAM ? 'Kurt rezervovaný • Náklady napoly' : undefined,
    isHost: lobby.isHost,
    isJoined: lobby.isJoined,
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
  const origin = hasGps
    ? { lat: profile.latitude as number, lng: profile.longitude as number }
    : undefined;

  let dbLobbies: LobbyCardData[] = [];
  let myLobbyRows: LobbyCardData[] = [];
  try {
    const nearbyOrCity = hasGps && origin
      ? (await getNearbyLobbyFeed({
          lat: origin.lat,
          lng: origin.lng,
          profileId: profile.id,
        })).lobbies
      : await getCityLobbyFeed(city, profile.id);
    myLobbyRows = await getMyLobbyCards(profile.id, origin);
    dbLobbies = mergeLobbyFeeds(myLobbyRows, nearbyOrCity);
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[lobby.page] feed failed', err);
    }
  }

  // Never fall back to mock cards — their IDs are not in `lobbies`, so Join
  // returns "Lobby not found". Empty feed + Create Lobby is the correct state.
  const initialMatches = dbLobbies.map(lobbyToMatchCard);
  const myLobbies = myLobbyRows.map(lobbyToMatchCard);

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
        myLobbies={myLobbies}
        groups={JSON.parse(JSON.stringify(groups)) as typeof groups}
      />
    </>
  );
}
