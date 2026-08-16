'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search } from 'lucide-react';
import type { HomeFilterVenue } from '@/lib/data/homepage';
import type { GroupCardData } from '@/lib/data/sport-groups-shared';
import { sportDisplayLabel } from '@/lib/data/sport-groups-shared';
import type { LobbySportKey, MatchCardData } from '@/types/lobby';
import { MOCK_MATCH_CARDS } from '@/lib/mockLobbyData';
import {
  filterMatchesBySport,
  LOBBY_SPORT_META,
} from '@/components/lobby/lobby-ui';
import { LobbySportPicker } from '@/components/lobby/LobbySportPicker';
import { LobbyActivityCard } from '@/components/lobby/LobbyActivityCard';
import { LobbyGrid } from '@/components/lobby/LobbyGrid';
import { CreateLobbyModal } from '@/components/lobby/CreateLobbyModal';
import { CreateCrewModal } from '@/components/lobby/CreateCrewModal';
import { LobbyPreviewModal } from '@/components/lobby/LobbyPreviewModal';
import {
  draftToLobbyPreview,
  matchCardToLobbyPreview,
  type LobbyPreviewData,
} from '@/components/lobby/lobby-preview';
import { PageTitleRow } from '@/components/shared/PageTitleRow';
import type { CreateLobbyDraft } from '@/types/lobby';
import { buildCreateLobbyPayload } from '@/lib/lobby-create';

export function LobbyPageView({
  city = 'Bratislava',
  venues = [],
  initialMatches,
  groups = [],
}: {
  city?: string;
  venues?: HomeFilterVenue[];
  initialMatches?: MatchCardData[];
  groups?: GroupCardData[];
}) {
  const router = useRouter();
  const [selectedSport, setSelectedSport] = useState<LobbySportKey | null>(null);
  const [search, setSearch] = useState('');
  const [lobbyModalOpen, setLobbyModalOpen] = useState(false);
  const [crewModalOpen, setCrewModalOpen] = useState(false);
  const [crewPreferWizard, setCrewPreferWizard] = useState(false);
  const [preview, setPreview] = useState<LobbyPreviewData | null>(null);

  function openCrewModal(preferWizard = false) {
    setCrewPreferWizard(preferWizard);
    setCrewModalOpen(true);
  }
  const [matches] = useState<MatchCardData[]>(
    initialMatches && initialMatches.length > 0 ? initialMatches : MOCK_MATCH_CARDS,
  );

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
    const match = matches.find((m) => m.id === id);
    if (!match) {
      router.push(`/lobby/${id}`);
      return;
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

  async function handleLobbyCreated(draft: CreateLobbyDraft) {
    const built = buildCreateLobbyPayload(draft, city);
    if (!built.ok) {
      throw new Error(built.error);
    }

    const res = await fetch('/api/lobbies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(built.payload),
    });
    const body = (await res.json().catch(() => null)) as {
      error?: string;
      lobbyId?: string;
    } | null;

    if (!res.ok || !body?.lobbyId) {
      throw new Error(body?.error ?? 'Lobby sa nepodarilo vytvoriť.');
    }

    setLobbyModalOpen(false);
    setPreview(draftToLobbyPreview(draft, body.lobbyId, city));
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
            </div>

            <LobbyQuickActions
              groups={groups}
              onCreateLobby={() => setLobbyModalOpen(true)}
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
                  onCreateLobby={() => setLobbyModalOpen(true)}
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

function LobbyQuickActions({
  groups,
  onCreateLobby,
  onOpenCrew,
}: {
  groups: GroupCardData[];
  onCreateLobby: () => void;
  /** preferWizard=true opens create wizard; false opens hub / empty create. */
  onOpenCrew: (preferWizard?: boolean) => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (menuRef.current && target && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  function handleCrewClick() {
    if (groups.length === 0) {
      onOpenCrew(false);
      return;
    }
    setMenuOpen((open) => !open);
  }

  function goToCrew(groupId: string) {
    setMenuOpen(false);
    router.push(`/lobby/groups/${groupId}`);
  }

  function createNewCrew() {
    setMenuOpen(false);
    onOpenCrew(true);
  }

  return (
    <div
      className="flex w-full min-w-0 items-stretch gap-0.5 rounded-2xl border border-white/10 bg-transparent p-1"
      role="group"
      aria-label="Vytvorenie lobby alebo crew"
    >
      <button
        type="button"
        onClick={onCreateLobby}
        className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary-container/20 bg-primary-container/10 px-2 py-2.5 font-label-caps text-[9px] uppercase tracking-[0.12em] text-white transition-colors duration-200 hover:border-primary-container/30 hover:bg-primary-container/15 active:scale-[0.98] sm:px-3"
      >
        <span
          className="material-symbols-outlined shrink-0 text-[16px] text-primary-container"
          aria-hidden
        >
          sports
        </span>
        <span className="truncate text-center leading-tight">Vytvorenie lobby</span>
      </button>

      <span className="my-1.5 w-px shrink-0 bg-white/10" aria-hidden />

      <div ref={menuRef} className="relative min-w-0 flex-1">
        <button
          type="button"
          onClick={handleCrewClick}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className={`flex w-full min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 font-label-caps text-[9px] uppercase tracking-[0.12em] transition-colors duration-200 active:scale-[0.98] sm:px-3 ${
            menuOpen
              ? 'border-[#FF5722]/35 bg-[#FF5722]/10 text-white'
              : 'border-transparent text-on-surface-variant hover:bg-white/[0.03] hover:text-zinc-200'
          }`}
        >
          <span
            className={`material-symbols-outlined shrink-0 text-[16px] ${
              menuOpen ? 'text-[#FF7F50]' : 'text-secondary'
            }`}
            aria-hidden
          >
            groups
          </span>
          <span className="truncate">CREW</span>
          {groups.length > 0 ? (
            <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-label-caps text-[8px] leading-none text-zinc-300">
              {groups.length}
            </span>
          ) : null}
          {groups.length > 0 ? (
            <span
              className={`material-symbols-outlined shrink-0 text-[14px] transition-transform ${
                menuOpen ? 'rotate-180 text-[#FF7F50]' : 'text-zinc-500'
              }`}
              aria-hidden
            >
              expand_more
            </span>
          ) : null}
        </button>

        {menuOpen && groups.length > 0 ? (
          <div
            role="menu"
            aria-label="Tvoje crew"
            className="absolute right-0 top-[calc(100%+6px)] z-50 w-[min(100vw-2rem,20rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#1F1F1F] shadow-2xl shadow-black/50"
          >
            <div className="border-b border-white/5 px-3 py-2.5">
              <p className="font-label-caps text-[9px] uppercase tracking-[0.14em] text-[#FF7F50]">
                My Crew Hub
              </p>
              <p className="mt-0.5 text-[11px] text-gray-400">
                Otvor existujúcu skupinu alebo vytvor novú
              </p>
            </div>

            <ul className="max-h-64 overflow-y-auto py-1">
              {groups.map((group) => (
                <li key={group.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => goToCrew(group.id)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[#FF5722]/10"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#262626] text-[#FF7F50]">
                      <span className="material-symbols-outlined text-[18px]">groups</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-white">{group.name}</span>
                      <span className="block truncate text-[11px] text-gray-400">
                        {sportDisplayLabel(group.sport)} · {group.memberCount}{' '}
                        {group.memberCount === 1 ? 'člen' : 'členov'}
                        {group.isOwner ? ' · Admin' : ''}
                      </span>
                    </span>
                    <span className="material-symbols-outlined shrink-0 text-[18px] text-gray-500">
                      chevron_right
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="border-t border-white/5 p-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={createNewCrew}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#FF5722] px-3 py-2.5 font-label-caps text-[9px] uppercase tracking-[0.12em] text-white transition hover:brightness-110 active:scale-[0.98]"
              >
                <span className="text-sm leading-none">+</span>
                Vytvoriť novú crew
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
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
