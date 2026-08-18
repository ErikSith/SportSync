'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Search } from 'lucide-react';
import type { HomeFilterVenue } from '@/lib/data/homepage';
import type { GroupCardData } from '@/lib/data/sport-groups-shared';
import { sportDisplayLabel } from '@/lib/data/sport-groups-shared';
import type { LobbySportKey, MatchCardData } from '@/types/lobby';
import { MOCK_MATCH_CARDS } from '@/lib/mockLobbyData';
import {
  filterMatchesBySport,
  LOBBY_SPORT_META,
  normalizeLobbySport,
} from '@/components/lobby/lobby-ui';
import { LobbySportPicker } from '@/components/lobby/LobbySportPicker';
import { LobbyActivityCard } from '@/components/lobby/LobbyActivityCard';
import { LobbyGrid } from '@/components/lobby/LobbyGrid';
import { CreateLobbyModal } from '@/components/lobby/CreateLobbyModal';
import { CreateCrewModal } from '@/components/lobby/CreateCrewModal';
import { LobbyPreviewModal } from '@/components/lobby/LobbyPreviewModal';
import {
  draftToLobbyPreview,
  draftToMatchCard,
  matchCardToLobbyPreview,
  type LobbyPreviewData,
} from '@/components/lobby/lobby-preview';
import { PageTitleRow } from '@/components/shared/PageTitleRow';
import { PlayerPreferencesAside } from '@/components/home/HomeFeedFilterButton';
import type { CreateLobbyDraft } from '@/types/lobby';
import { buildCreateLobbyPayload } from '@/lib/lobby-create';
import { authedFetch } from '@/lib/auth/authed-fetch';

function mergeLobbyMatchLists(
  created: MatchCardData[],
  initial?: MatchCardData[],
): MatchCardData[] {
  const server = initial ?? [];
  const serverIds = new Set(server.map((match) => match.id));
  const local = created.filter((match) => !serverIds.has(match.id));
  const base = server.length > 0 ? server : local.length > 0 ? [] : MOCK_MATCH_CARDS;
  if (local.length === 0) return base;
  const localIds = new Set(local.map((match) => match.id));
  return [...local, ...base.filter((match) => !localIds.has(match.id))];
}

export function LobbyPageView({
  city = 'Bratislava',
  venues = [],
  initialMatches,
  myLobbies = [],
  groups = [],
}: {
  city?: string;
  venues?: HomeFilterVenue[];
  initialMatches?: MatchCardData[];
  myLobbies?: MatchCardData[];
  groups?: GroupCardData[];
  /** Kept for later auth — create lobby is open without registration for now. */
  isGuest?: boolean;
}) {
  const router = useRouter();
  const [selectedSport, setSelectedSport] = useState<LobbySportKey | null>(null);
  const [search, setSearch] = useState('');
  const [lobbyModalOpen, setLobbyModalOpen] = useState(false);
  const [crewModalOpen, setCrewModalOpen] = useState(false);
  const [crewPreferWizard, setCrewPreferWizard] = useState(false);
  const [preview, setPreview] = useState<LobbyPreviewData | null>(null);
  const [createdMatches, setCreatedMatches] = useState<MatchCardData[]>([]);

  function openCrewModal(preferWizard = false) {
    setCrewPreferWizard(preferWizard);
    setCrewModalOpen(true);
  }

  function openCreateLobby() {
    setLobbyModalOpen(true);
  }
  const matches = useMemo(
    () => mergeLobbyMatchLists(createdMatches, initialMatches),
    [createdMatches, initialMatches],
  );

  const myActiveLobbies = useMemo(() => {
    const byId = new Map(myLobbies.map((lobby) => [lobby.id, lobby]));
    for (const card of createdMatches) {
      if (!byId.has(card.id)) {
        byId.set(card.id, { ...card, isHost: true, isJoined: true });
      }
    }
    const createdIds = new Set(createdMatches.map((card) => card.id));
    const all = [...byId.values()];
    return [
      ...all.filter((lobby) => createdIds.has(lobby.id)),
      ...all.filter((lobby) => !createdIds.has(lobby.id)),
    ];
  }, [createdMatches, myLobbies]);

  const sportMatches = useMemo(
    () => filterMatchesBySport(matches, selectedSport),
    [matches, selectedSport],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sportMatches;
    return sportMatches.filter(
      (m) =>
        m.sport.toLowerCase().includes(q) ||
        m.venueName.toLowerCase().includes(q) ||
        m.title.toLowerCase().includes(q) ||
        (m.teamName?.toLowerCase().includes(q) ?? false) ||
        m.roster.some((p) => p.name.toLowerCase().includes(q)),
    );
  }, [sportMatches, search]);

  const featured = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pool = !q
      ? matches
      : matches.filter(
          (m) =>
            m.sport.toLowerCase().includes(q) ||
            m.venueName.toLowerCase().includes(q) ||
            m.title.toLowerCase().includes(q) ||
            (m.teamName?.toLowerCase().includes(q) ?? false) ||
            m.roster.some((p) => p.name.toLowerCase().includes(q)),
        );
    return pool;
  }, [matches, search]);

  function openMatch(id: string) {
    const match =
      matches.find((m) => m.id === id) ?? myActiveLobbies.find((m) => m.id === id);
    if (!match) {
      router.push(`/lobby/${id}`);
      return;
    }
    const sportKey = normalizeLobbySport(match.sport);
    if (sportKey) {
      setSelectedSport(sportKey);
      setSearch('');
    }
    setPreview(matchCardToLobbyPreview(match));
  }

  function selectSport(sport: LobbySportKey) {
    setSelectedSport(sport);
    setSearch('');
  }

  function clearSport() {
    setSelectedSport(null);
    setSearch('');
  }

  useLayoutEffect(() => {
    if (!selectedSport) return;

    const scrollTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    scrollTop();
    const frame = requestAnimationFrame(scrollTop);
    return () => cancelAnimationFrame(frame);
  }, [selectedSport]);

  function revealCreatedLobby(draft: CreateLobbyDraft, lobbyId: string) {
    const card = draftToMatchCard(draft, lobbyId, city);
    setCreatedMatches((prev) => [card, ...prev.filter((match) => match.id !== lobbyId)]);
    const sportKey = normalizeLobbySport(draft.sport);
    if (sportKey) {
      setSelectedSport(sportKey);
      setSearch('');
    }
    setLobbyModalOpen(false);
    setPreview(draftToLobbyPreview(draft, lobbyId, city));
  }

  async function handleLobbyCreated(draft: CreateLobbyDraft) {
    const built = buildCreateLobbyPayload(draft, city);
    if (!built.ok) {
      throw new Error(built.error);
    }

    const res = await authedFetch('/api/lobbies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(built.payload),
    });
    const body = (await res.json().catch(() => null)) as {
      error?: string;
      lobbyId?: string;
    } | null;

    if (res.status === 401) {
      revealCreatedLobby(draft, `preview-${crypto.randomUUID()}`);
      return;
    }

    if (!res.ok || !body?.lobbyId) {
      throw new Error(body?.error ?? 'Lobby sa nepodarilo vytvoriť.');
    }

    revealCreatedLobby(draft, body.lobbyId);
    router.refresh();
  }

  const sportMeta = selectedSport ? LOBBY_SPORT_META[selectedSport] : null;

  return (
    <div className="relative min-h-dvh bg-background text-on-surface">
      <div className="ambient-glow-layer pointer-events-none fixed inset-0" aria-hidden>
        <div className="ambient-glow left-[-160px] top-16 h-[420px] w-[420px] bg-primary-container/10" />
        <div className="ambient-glow right-[-120px] top-56 h-[360px] w-[360px] bg-secondary-container/5" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-screen-xl min-w-0 flex-col gap-4 px-container-margin-mobile pb-28 pt-5 md:gap-5 md:px-container-margin-desktop">
        {selectedSport && sportMeta ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={clearSport}
                aria-label="Back to sports"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-zinc-900/40 text-zinc-300 transition hover:border-white/15 hover:text-white active:scale-95"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-label-caps text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  Lobby
                </p>
                <h1 className="font-headline-md text-[26px] leading-tight tracking-wide text-white sm:text-3xl">
                  {sportMeta.label}
                </h1>
              </div>
              <PlayerPreferencesAside venues={venues} city={city} variant="minimal" />
            </div>

            <LobbyQuickActions
              groups={groups}
              myLobbies={myActiveLobbies}
              onCreateLobby={openCreateLobby}
              onOpenLobby={openMatch}
              onOpenCrew={openCrewModal}
            />

            <SearchField
              value={search}
              onChange={setSearch}
              placeholder={`Search ${sportMeta.label.toLowerCase()} lobbies…`}
            />

            <LobbyGrid
              matches={visible}
              onAction={openMatch}
              emptyMessage={`No open ${sportMeta.label} lobbies yet. Create one and invite people.`}
            />
          </div>
        ) : (
          <>
            <PageTitleRow
              city={city}
              venues={venues}
              showPreferences
              preferencesVariant="minimal"
              title={
                <div className="min-w-0 space-y-1">
                  <p className="font-label-caps text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                    Matchmaking
                  </p>
                  <h1 className="font-headline-md text-[28px] leading-tight tracking-wide text-white sm:text-3xl md:text-4xl">
                    Lobby
                  </h1>
                </div>
              }
              subtitle={
                <p className="max-w-md font-body-md text-sm text-zinc-400 md:text-body-md">
                  Pick a sport, then join an open lobby nearby — or create your own.
                </p>
              }
              actions={
                <LobbyQuickActions
                  groups={groups}
                  myLobbies={myActiveLobbies}
                  onCreateLobby={openCreateLobby}
                  onOpenLobby={openMatch}
                  onOpenCrew={openCrewModal}
                />
              }
            />

            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search players or teams..."
            />

            <LobbySportPicker matches={matches} onSelect={selectSport} />

            <section className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-label-caps text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Featured Activity
                </h2>
                <p className="font-label-caps text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                  {featured.length} open
                </p>
              </div>
              {featured.length === 0 ? (
                <p className="text-sm text-zinc-500">No open lobbies nearby right now.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {featured.map((match) => (
                    <LobbyActivityCard key={match.id} match={match} onView={openMatch} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <CreateLobbyModal
        open={lobbyModalOpen}
        onClose={() => setLobbyModalOpen(false)}
        onCreated={handleLobbyCreated}
        venues={venues}
        city={city}
        initialSport={selectedSport ? LOBBY_SPORT_META[selectedSport].label : undefined}
      />
      <CreateCrewModal
        open={crewModalOpen}
        onClose={() => {
          setCrewModalOpen(false);
          setCrewPreferWizard(false);
        }}
        groups={groups}
        preferWizard={crewPreferWizard}
        onCreated={() => router.refresh()}
      />
      {preview ? (
        <LobbyPreviewModal
          lobby={preview}
          open
          onClose={() => {
            setPreview(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function lobbyRoleLabel(lobby: MatchCardData): string {
  if (lobby.isHost) return 'Tvoja lobby';
  if (lobby.isJoined) return 'Si v aktívnej';
  return 'Aktívna';
}

function LobbyQuickActions({
  groups,
  myLobbies,
  onCreateLobby,
  onOpenLobby,
  onOpenCrew,
}: {
  groups: GroupCardData[];
  myLobbies: MatchCardData[];
  onCreateLobby: () => void;
  onOpenLobby: (id: string) => void;
  /** preferWizard=true opens create wizard; false opens hub / empty create. */
  onOpenCrew: (preferWizard?: boolean) => void;
}) {
  const router = useRouter();
  const lobbyTitleId = useId();
  const crewTitleId = useId();
  const [lobbyOpen, setLobbyOpen] = useState(false);
  const [crewOpen, setCrewOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const hasLobbies = myLobbies.length > 0;
  const hasCrews = groups.length > 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!lobbyOpen && !crewOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setLobbyOpen(false);
        setCrewOpen(false);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [crewOpen, lobbyOpen]);

  function handleLobbyClick() {
    if (!hasLobbies) {
      onCreateLobby();
      return;
    }
    setCrewOpen(false);
    setLobbyOpen((open) => !open);
  }

  function handleCrewClick() {
    if (!hasCrews) {
      onOpenCrew(false);
      return;
    }
    setLobbyOpen(false);
    setCrewOpen((open) => !open);
  }

  function goToCrew(groupId: string) {
    setCrewOpen(false);
    router.push(`/lobby/groups/${groupId}`);
  }

  function createNewCrew() {
    setCrewOpen(false);
    onOpenCrew(true);
  }

  function goToLobby(lobbyId: string) {
    setLobbyOpen(false);
    onOpenLobby(lobbyId);
  }

  function createNewLobby() {
    setLobbyOpen(false);
    onCreateLobby();
  }

  return (
    <>
      <div
        className="flex w-full min-w-0 items-stretch gap-0.5 rounded-2xl border border-white/10 bg-transparent p-1"
        role="group"
        aria-label="Vytvorenie lobby alebo crew"
      >
        <button
          type="button"
          onClick={handleLobbyClick}
          aria-expanded={hasLobbies ? lobbyOpen : undefined}
          aria-haspopup={hasLobbies ? 'dialog' : undefined}
          className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 font-label-caps text-[9px] uppercase tracking-[0.12em] transition-colors duration-200 active:scale-[0.98] sm:px-3 ${
            lobbyOpen || !hasLobbies
              ? 'border-primary-container/20 bg-primary-container/10 text-white hover:border-primary-container/30 hover:bg-primary-container/15'
              : 'border-transparent text-on-surface-variant hover:bg-white/[0.03] hover:text-zinc-200'
          }`}
        >
          <span
            className="material-symbols-outlined shrink-0 text-[16px] text-primary-container"
            aria-hidden
          >
            sports
          </span>
          <span className="truncate text-center leading-tight">
            {hasLobbies ? 'Lobby' : 'Vytvorenie lobby'}
          </span>
          {hasLobbies ? (
            <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-label-caps text-[8px] leading-none text-zinc-300">
              {myLobbies.length}
            </span>
          ) : null}
          {hasLobbies ? (
            <span
              className={`material-symbols-outlined shrink-0 text-[14px] transition-transform ${
                lobbyOpen ? 'rotate-180 text-primary-container' : 'text-zinc-500'
              }`}
              aria-hidden
            >
              expand_more
            </span>
          ) : null}
        </button>

        <span className="my-1.5 w-px shrink-0 bg-white/10" aria-hidden />

        <button
          type="button"
          onClick={handleCrewClick}
          aria-expanded={hasCrews ? crewOpen : undefined}
          aria-haspopup={hasCrews ? 'dialog' : undefined}
          className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 font-label-caps text-[9px] uppercase tracking-[0.12em] transition-colors duration-200 active:scale-[0.98] sm:px-3 ${
            crewOpen
              ? 'border-primary-container/30 bg-primary-container/10 text-white'
              : 'border-transparent text-on-surface-variant hover:bg-white/[0.03] hover:text-zinc-200'
          }`}
        >
          <span
            className={`material-symbols-outlined shrink-0 text-[16px] ${
              crewOpen ? 'text-primary-container' : 'text-secondary'
            }`}
            aria-hidden
          >
            groups
          </span>
          <span className="truncate">CREW</span>
          {hasCrews ? (
            <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-label-caps text-[8px] leading-none text-zinc-300">
              {groups.length}
            </span>
          ) : null}
          {hasCrews ? (
            <span
              className={`material-symbols-outlined shrink-0 text-[14px] transition-transform ${
                crewOpen ? 'rotate-180 text-primary-container' : 'text-zinc-500'
              }`}
              aria-hidden
            >
              expand_more
            </span>
          ) : null}
        </button>
      </div>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {lobbyOpen && hasLobbies ? (
                <QuickActionHub
                  key="lobby-hub"
                  titleId={lobbyTitleId}
                  kicker="Lobby"
                  title="Moje lobby"
                  subtitle="Otvor aktívnu alebo vytvor novú"
                  onClose={() => setLobbyOpen(false)}
                  createLabel="+ Vytvoriť lobby"
                  onCreate={createNewLobby}
                >
                  {myLobbies.map((lobby) => (
                    <button
                      key={lobby.id}
                      type="button"
                      onClick={() => goToLobby(lobby.id)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-transparent px-3.5 py-3.5 text-left transition-colors duration-200 hover:border-white/16 hover:bg-white/[0.02]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-transparent text-zinc-500">
                        <span className="material-symbols-outlined text-[18px]">sports</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-body-sm text-sm text-white">
                          {lobby.title || lobby.sport}
                        </p>
                        <p className="mt-0.5 truncate font-body-sm text-xs text-zinc-500">
                          {lobby.sport} · {lobby.dateLabel} {lobby.timeLabel} · {lobbyRoleLabel(lobby)}
                        </p>
                      </div>
                      <span className="material-symbols-outlined shrink-0 text-[18px] text-zinc-500">
                        chevron_right
                      </span>
                    </button>
                  ))}
                </QuickActionHub>
              ) : null}
              {crewOpen && hasCrews ? (
                <QuickActionHub
                  key="crew-hub"
                  titleId={crewTitleId}
                  kicker="Crew"
                  title="My Crew Hub"
                  subtitle="Otvor skupinu alebo vytvor novú"
                  onClose={() => setCrewOpen(false)}
                  createLabel="+ Vytvoriť crew"
                  onCreate={createNewCrew}
                >
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => goToCrew(group.id)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-transparent px-3.5 py-3.5 text-left transition-colors duration-200 hover:border-white/16 hover:bg-white/[0.02]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-transparent text-zinc-500">
                        <span className="material-symbols-outlined text-[18px]">groups</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-body-sm text-sm text-white">{group.name}</p>
                        <p className="mt-0.5 truncate font-body-sm text-xs text-zinc-500">
                          {sportDisplayLabel(group.sport)} · {group.memberCount}{' '}
                          {group.memberCount === 1 ? 'člen' : 'členov'}
                          {group.isOwner ? ' · Admin' : ''}
                        </p>
                      </div>
                      <span className="material-symbols-outlined shrink-0 text-[18px] text-zinc-500">
                        chevron_right
                      </span>
                    </button>
                  ))}
                </QuickActionHub>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}

function QuickActionHub({
  titleId,
  kicker,
  title,
  subtitle,
  onClose,
  createLabel,
  onCreate,
  children,
}: {
  titleId: string;
  kicker: string;
  title: string;
  subtitle: string;
  onClose: () => void;
  createLabel: string;
  onCreate: () => void;
  children: ReactNode;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button type="button" aria-label="Zavrieť" className="absolute inset-0" onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ y: 16, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 16, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="glass-panel relative z-[101] flex max-h-[min(88dvh,620px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative shrink-0 border-b border-white/5 px-5 pb-3 pt-5 text-center">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 text-on-surface-variant transition-colors hover:text-primary"
            aria-label="Zavrieť"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
          <p className="font-label-caps text-[10px] uppercase tracking-[0.18em] text-primary-container">
            {kicker}
          </p>
          <h2 id={titleId} className="mt-0.5 font-headline-md text-[20px] text-on-surface">
            {title}
          </h2>
          <p className="mt-1 font-label-caps text-[9px] uppercase tracking-[0.12em] text-zinc-500">
            {subtitle}
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-5">{children}</div>

        <div className="flex shrink-0 gap-2 border-t border-white/5 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-outline/30 py-3 font-label-caps text-[11px] text-on-surface-variant transition-colors hover:text-on-surface"
          >
            Zrušiť
          </button>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-primary-container/35 bg-primary-container/10 py-3 font-label-caps text-[11px] text-white transition-all hover:border-primary-container/50 hover:bg-primary-container/15 active:scale-[0.98]"
          >
            {createLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative block">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-low py-2.5 pl-10 pr-3 text-sm text-on-surface outline-none placeholder:text-zinc-500 focus:border-outline-variant/40"
      />
    </label>
  );
}
