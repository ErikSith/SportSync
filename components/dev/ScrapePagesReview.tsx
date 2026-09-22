'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { authedFetch } from '@/lib/auth/authed-fetch';
import { VenueAdminDossier } from '@/components/dev/VenueAdminDossier';
import {
  BRATISLAVA_BOROUGHS,
  type BratislavaDistrict,
} from '@/lib/scrape/bratislava-location';

type ReviewerTab = 'scrape' | 'review';

type VenuePage = {
  id: string;
  url: string;
  kind: string;
  enabled: boolean;
  contentSelector: string | null;
  bookingProvider: string | null;
  bookingSubject: string | null;
  lastScrapedAt: string | null;
  lastStatus: string | null;
};

type VenueGroup = {
  venueId: string;
  venueName: string;
  venueCity: string | null;
  borough: string | null;
  websiteUrl: string | null;
  googlePlaceId?: string | null;
  pages: VenuePage[];
};

type PreviewResult = {
  ok: boolean;
  usedSelector?: string | null;
  preferredMatched?: boolean;
  charCount?: number;
  textPreview?: string;
  truncated?: boolean;
  error?: string;
};

type ExtractResult = {
  ok: boolean;
  eventCount?: number;
  events?: Array<{
    title: string;
    startTime: string;
    sport: string | null;
    isTournament: boolean;
  }>;
  usedSelector?: string | null;
  preferredMatched?: boolean;
  charCount?: number;
  error?: string;
  upsert?: {
    created?: number;
    updated?: number;
    unchanged?: number;
    skipped?: number;
    tournamentsCreated?: number;
    tournamentsUpdated?: number;
  } | null;
  message?: string;
  skippedGemini?: boolean;
};

type Filters = {
  /** '' / 'bratislava' = celá BA; else borough slug */
  borough: string;
  q: string;
};

const OKRES_ORDER: BratislavaDistrict[] = [
  'Bratislava I',
  'Bratislava II',
  'Bratislava III',
  'Bratislava IV',
  'Bratislava V',
];

const BOROUGHS_BY_OKRES = OKRES_ORDER.map((okres) => ({
  okres,
  boroughs: BRATISLAVA_BOROUGHS.filter((b) => b.district === okres),
}));

function normalizeBoroughFilter(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (!key || key === 'bratislava' || key === 'all' || key === 'city') return 'bratislava';
  return key;
}

function boroughApiParam(borough: string): string | null {
  const n = normalizeBoroughFilter(borough);
  return n === 'bratislava' ? null : n;
}

const PAGE_KINDS = [
  'website',
  'schedule',
  'availability',
  'events',
  'tournaments',
  'kids_camps',
  'other',
] as const;
const ADD_KINDS = [
  'availability',
  'schedule',
  'events',
  'tournaments',
  'kids_camps',
  'website',
  'other',
] as const;

const KIND_LABELS: Record<string, string> = {
  website: 'website — homepage',
  schedule: 'schedule — rozvrh / lekcie',
  availability: 'availability — kalendár kurtov (voľný / obsadený)',
  events: 'events — akcie',
  tournaments: 'tournaments — turnaje',
  kids_camps: 'kids_camps — detské tábory (viacdňové)',
  other: 'other',
};

export function AdminReviewer({
  initialBorough = 'bratislava',
  initialVenueId,
  initialTab = 'scrape',
}: {
  initialBorough?: string;
  initialVenueId?: string;
  initialTab?: ReviewerTab;
} = {}) {
  const [venues, setVenues] = useState<VenueGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [venueIndex, setVenueIndex] = useState(0);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ReviewerTab>(initialTab);
  const pendingVenueIdRef = useRef<string | null>(initialVenueId ?? null);

  const [draftBorough, setDraftBorough] = useState(normalizeBoroughFilter(initialBorough));
  const [draftSearch, setDraftSearch] = useState('');
  const [filters, setFilters] = useState<Filters>({
    borough: normalizeBoroughFilter(initialBorough),
    q: '',
  });

  const [selectorDraft, setSelectorDraft] = useState('');
  const [kindDraft, setKindDraft] = useState('website');
  const [bookingProviderDraft, setBookingProviderDraft] = useState('');
  const [bookingSubjectDraft, setBookingSubjectDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [runningScrape, setRunningScrape] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [extract, setExtract] = useState<ExtractResult | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [addUrlsDraft, setAddUrlsDraft] = useState('');
  const [addKind, setAddKind] = useState<string>('availability');
  const [addingUrls, setAddingUrls] = useState(false);
  const [addMsg, setAddMsg] = useState<string | null>(null);

  const [removingVenue, setRemovingVenue] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', '1000');
      params.set('offset', '0');
      params.set('enabled', 'all');
      const boroughParam = boroughApiParam(filters.borough);
      if (boroughParam) params.set('borough', boroughParam);
      if (filters.q.trim()) params.set('q', filters.q.trim());

      const res = await authedFetch(`/api/dev/scrape-venues?${params}`);
      const data = (await res.json()) as {
        ok?: boolean;
        venues?: VenueGroup[];
        total?: number;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const list = data.venues ?? [];
      setVenues(list);
      setTotal(data.total ?? list.length);
      let nextIndex = 0;
      const want = pendingVenueIdRef.current;
      if (want) {
        const found = list.findIndex((v) => v.venueId === want);
        if (found >= 0) nextIndex = found;
        pendingVenueIdRef.current = null;
      }
      setVenueIndex(nextIndex);
      setSelectedPageId(list[nextIndex]?.pages.find((p) => p.enabled)?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setVenues([]);
      setTotal(0);
      setSelectedPageId(null);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const currentVenue = venues[venueIndex] ?? null;
  const scrapePagesForVenue = (currentVenue?.pages ?? []).filter((p) => p.enabled);
  const selectedPage =
    scrapePagesForVenue.find((p) => p.id === selectedPageId) ??
    scrapePagesForVenue[0] ??
    null;

  useEffect(() => {
    if (!currentVenue) return;
    const params = new URLSearchParams();
    const boroughParam = boroughApiParam(filters.borough);
    params.set('borough', boroughParam ?? 'bratislava');
    params.set('venue', currentVenue.venueId);
    params.set('tab', tab);
    const qs = params.toString();
    const next = qs ? `/dev/scrape-pages?${qs}` : '/dev/scrape-pages';
    if (typeof window !== 'undefined' && window.location.pathname === '/dev/scrape-pages') {
      window.history.replaceState(null, '', next);
    }
  }, [currentVenue?.venueId, filters.borough, tab]);

  useEffect(() => {
    if (!currentVenue) {
      setSelectedPageId(null);
      return;
    }
    const enabled = currentVenue.pages.filter((p) => p.enabled);
    const stillThere = enabled.some((p) => p.id === selectedPageId);
    if (!stillThere) {
      setSelectedPageId(enabled[0]?.id ?? null);
    }
  }, [currentVenue, selectedPageId]);

  useEffect(() => {
    setSelectorDraft(selectedPage?.contentSelector ?? '');
    setKindDraft(selectedPage?.kind ?? 'website');
    setBookingProviderDraft(selectedPage?.bookingProvider ?? '');
    setBookingSubjectDraft(selectedPage?.bookingSubject ?? '');
    setPreview(null);
    setExtract(null);
    setSaveMsg(null);
  }, [selectedPage?.id]);

  const applyFilters = () => {
    setFilters({
      borough: normalizeBoroughFilter(draftBorough),
      q: draftSearch,
    });
  };

  const setBoroughFilter = (value: string) => {
    const next = normalizeBoroughFilter(value);
    setDraftBorough(next);
    setFilters((prev) => ({ ...prev, borough: next }));
    setAreaOpen(false);
  };

  const areaLabel = (() => {
    const key = normalizeBoroughFilter(draftBorough);
    if (key === 'bratislava') return 'Celá Bratislava';
    return BRATISLAVA_BOROUGHS.find((b) => b.slug === key)?.borough ?? key;
  })();

  const removeCurrentVenue = async () => {
    if (!currentVenue) return;
    const ok = window.confirm(
      `Odstrániť športovisko „${currentVenue.venueName}“ z databázy?\n\n` +
        `Vymaže venue z DB a ${currentVenue.pages.length} scrape URL.\n` +
        `Eventy/lobby ostanú (bez väzby na venue). Toto sa nedá vrátiť späť.`,
    );
    if (!ok) return;
    setRemovingVenue(true);
    try {
      const res = await authedFetch(
        `/api/dev/scrape-venues/${currentVenue.venueId}?hard=1`,
        { method: 'DELETE' },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        removedCount?: number;
        venueDeleted?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

      setVenues((prev) => {
        const next = prev.filter((v) => v.venueId !== currentVenue.venueId);
        setTotal((t) => Math.max(0, t - 1));
        setVenueIndex((i) => Math.min(i, Math.max(0, next.length - 1)));
        return next;
      });
      setSelectedPageId(null);
      setSaveMsg(
        data.venueDeleted === false
          ? `Scrape URL odstránené (${data.removedCount ?? 0}), venue ostalo`
          : `Športovisko odstránené z DB (−${data.removedCount ?? 0} URL)`,
      );
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setRemovingVenue(false);
    }
  };

  const updateVenuePages = (venueId: string, nextPages: VenuePage[]) => {
    setVenues((prev) =>
      prev.map((v) => (v.venueId === venueId ? { ...v, pages: nextPages } : v)),
    );
  };

  const saveSelected = async () => {
    if (!selectedPage || !currentVenue) return;
    if (/^https?:\/\//i.test(selectorDraft.trim())) {
      setSaveMsg(
        'contentSelector je CSS (napr. .events-list), nie URL. Ďalšie linky pridaj nižšie.',
      );
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await authedFetch(`/api/dev/scrape-pages/${selectedPage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentSelector: selectorDraft,
          kind: kindDraft,
          bookingProvider: bookingProviderDraft || null,
          bookingSubject: bookingSubjectDraft.trim() || null,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        contentSelector?: string | null;
        kind?: string;
        bookingProvider?: string | null;
        bookingSubject?: string | null;
        error?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const nextPages = currentVenue.pages.map((p) =>
        p.id === selectedPage.id
          ? {
              ...p,
              contentSelector: data.contentSelector ?? null,
              kind: data.kind ?? kindDraft,
              bookingProvider: data.bookingProvider ?? null,
              bookingSubject: data.bookingSubject ?? null,
            }
          : p,
      );
      updateVenuePages(currentVenue.venueId, nextPages);
      setSelectorDraft(data.contentSelector ?? '');
      setKindDraft(data.kind ?? kindDraft);
      setBookingProviderDraft(data.bookingProvider ?? '');
      setBookingSubjectDraft(data.bookingSubject ?? '');
      setSaveMsg('Uložené');
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const deletePage = async (page: VenuePage) => {
    if (!currentVenue) return;
    const ok = window.confirm(`Vymazať tento link?\n\n${page.url}`);
    if (!ok) return;
    setDeletingId(page.id);
    try {
      const res = await authedFetch(`/api/dev/scrape-pages/${page.id}`, {
        method: 'DELETE',
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

      const nextPages = currentVenue.pages.filter((p) => p.id !== page.id);
      // Venue stays in the list even with 0 pages — only top Odstrániť removes it.
      updateVenuePages(currentVenue.venueId, nextPages);
      if (selectedPageId === page.id) {
        setSelectedPageId(nextPages[0]?.id ?? null);
      }
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setDeletingId(null);
    }
  };

  const toggleEnabled = async (page: VenuePage) => {
    if (!currentVenue) return;
    // Scrape tab lists only enabled targets — Disable removes from scrape set.
    try {
      const res = await authedFetch(`/api/dev/scrape-pages/${page.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        enabled?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      updateVenuePages(
        currentVenue.venueId,
        currentVenue.pages.map((p) =>
          p.id === page.id ? { ...p, enabled: false } : p,
        ),
      );
      if (selectedPageId === page.id) {
        const nextEnabled = currentVenue.pages.filter(
          (p) => p.id !== page.id && p.enabled,
        );
        setSelectedPageId(nextEnabled[0]?.id ?? null);
      }
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const addSiblingUrls = async () => {
    if (!currentVenue) return;
    setAddingUrls(true);
    setAddMsg(null);
    try {
      const res = await authedFetch('/api/dev/scrape-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: addUrlsDraft,
          kind: addKind,
          venueId: currentVenue.venueId,
          borough: currentVenue.borough,
          enabled: true,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        createdCount?: number;
        updatedCount?: number;
        created?: Array<{
          id: string;
          url: string;
          kind: string;
          enabled: boolean;
          contentSelector: string | null;
          bookingProvider?: string | null;
          bookingSubject?: string | null;
        }>;
        updated?: Array<{
          id: string;
          url: string;
          kind: string;
          enabled: boolean;
          contentSelector: string | null;
          bookingProvider?: string | null;
          bookingSubject?: string | null;
        }>;
        errors?: Array<{ url: string; error: string }>;
        error?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

      const fresh = [...(data.created ?? []), ...(data.updated ?? [])].map(
        (p): VenuePage => ({
          id: p.id,
          url: p.url,
          kind: p.kind,
          enabled: p.enabled,
          contentSelector: p.contentSelector,
          bookingProvider: p.bookingProvider ?? null,
          bookingSubject: p.bookingSubject ?? null,
          lastScrapedAt: null,
          lastStatus: null,
        }),
      );

      if (fresh.length) {
        const byId = new Map(currentVenue.pages.map((p) => [p.id, p]));
        for (const p of fresh) byId.set(p.id, { ...byId.get(p.id), ...p });
        const nextPages = Array.from(byId.values()).sort((a, b) =>
          a.url.localeCompare(b.url),
        );
        updateVenuePages(currentVenue.venueId, nextPages);
        setSelectedPageId(fresh[0]?.id ?? selectedPageId);
      }

      const errPart =
        data.errors && data.errors.length
          ? ` · chyby: ${data.errors.map((e) => e.url).join(', ')}`
          : '';
      setAddMsg(
        `Pridané ${data.createdCount ?? 0}, aktualizované ${data.updatedCount ?? 0}${errPart}`,
      );
      setAddUrlsDraft('');
    } catch (err) {
      setAddMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setAddingUrls(false);
    }
  };

  const runPreview = async () => {
    if (!selectedPage) return;
    setPreviewing(true);
    setPreview(null);
    try {
      const res = await authedFetch(`/api/dev/scrape-pages/${selectedPage.id}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentSelector: selectorDraft || null }),
      });
      const data = (await res.json()) as PreviewResult;
      setPreview(data);
    } catch (err) {
      setPreview({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setPreviewing(false);
    }
  };

  const runExtract = async () => {
    if (!selectedPage) return;
    setExtracting(true);
    setExtract(null);
    try {
      const res = await authedFetch(`/api/dev/scrape-pages/${selectedPage.id}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentSelector: selectorDraft || null }),
      });
      const data = (await res.json()) as ExtractResult;
      setExtract(data);
    } catch (err) {
      setExtract({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setExtracting(false);
    }
  };

  const runScrapeWrite = async () => {
    if (!selectedPage || !currentVenue) return;
    setRunningScrape(true);
    setExtract(null);
    setSaveMsg(null);
    try {
      const res = await authedFetch(`/api/dev/scrape-pages/${selectedPage.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentSelector: selectorDraft || null }),
      });
      const data = (await res.json()) as ExtractResult;
      setExtract(data);
      if (data.ok) {
        const u = data.upsert;
        setSaveMsg(
          data.skippedGemini
            ? data.message ?? 'Žiadne event signály'
            : `Zapísané do Review: ${data.eventCount ?? 0} nájdených` +
                (u
                  ? ` (+${u.created ?? 0} / ~${u.updated ?? 0} / =${u.unchanged ?? 0})`
                  : ''),
        );
        updateVenuePages(
          currentVenue.venueId,
          currentVenue.pages.map((p) =>
            p.id === selectedPage.id
              ? {
                  ...p,
                  enabled: true,
                  lastScrapedAt: new Date().toISOString(),
                  lastStatus: data.skippedGemini
                    ? 'ok:no-event-signal'
                    : `ok:events=${data.eventCount ?? 0}`,
                }
              : p,
          ),
        );
      }
    } catch (err) {
      setExtract({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setRunningScrape(false);
    }
  };

  const scrapePages = (currentVenue?.pages ?? []).filter((p) => p.enabled);
  const pagesByKind = PAGE_KINDS.map((kind) => ({
    kind,
    pages: scrapePages.filter((p) => p.kind === kind),
  })).filter((g) => g.pages.length > 0);

  const otherPages = scrapePages.filter(
    (p) => !(PAGE_KINDS as readonly string[]).includes(p.kind),
  );

  const chip =
    'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors';
  const chipOn = 'border-primary/50 bg-primary/20 text-primary';
  const chipIdle =
    'border-white/15 text-on-surface-variant hover:border-white/30 hover:text-on-surface';

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
          <div className="relative" data-area-filter="bratislava-boroughs-v1">
            <p className="text-sm text-on-surface-variant mb-1">Oblasť</p>
            <button
              type="button"
              aria-expanded={areaOpen}
              aria-haspopup="listbox"
              onClick={() => setAreaOpen((o) => !o)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-surface-container-low px-3 py-2 text-sm text-on-surface hover:border-white/30 min-w-[12rem]"
            >
              <span className="flex-1 text-left">{areaLabel}</span>
              <span
                className={`material-symbols-outlined text-base text-on-surface-variant transition-transform ${
                  areaOpen ? 'rotate-180' : ''
                }`}
              >
                expand_more
              </span>
            </button>
            {areaOpen && (
              <div
                className="absolute z-30 mt-1 w-[min(100vw-2rem,22rem)] rounded-xl border border-white/10 bg-surface-container-low p-3 shadow-2xl shadow-black/50 space-y-2"
                role="listbox"
                aria-label="Mestské časti"
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={normalizeBoroughFilter(draftBorough) === 'bratislava'}
                  onClick={() => setBoroughFilter('bratislava')}
                  className={`${chip} ${
                    normalizeBoroughFilter(draftBorough) === 'bratislava' ? chipOn : chipIdle
                  }`}
                >
                  Celá Bratislava
                </button>
                {BOROUGHS_BY_OKRES.map((group) => (
                  <div key={group.okres} className="space-y-1.5">
                    <p className="font-label-caps text-[8px] uppercase tracking-[0.14em] text-tertiary">
                      {group.okres}
                    </p>
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      {group.boroughs.map((borough) => {
                        const active =
                          normalizeBoroughFilter(draftBorough) === borough.slug;
                        return (
                          <button
                            key={borough.slug}
                            type="button"
                            role="option"
                            aria-selected={active}
                            onClick={() => setBoroughFilter(borough.slug)}
                            className={`${chip} ${active ? chipOn : chipIdle}`}
                          >
                            {borough.borough}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <label className="flex flex-col gap-1 text-sm text-on-surface-variant flex-1 min-w-[12rem]">
            Search venue / URL
            <input
              className="rounded-lg border border-white/10 bg-surface-container-low px-3 py-2 text-on-surface"
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyFilters();
              }}
              placeholder="Plavecká / plaveckaakademia"
            />
          </label>
          <button
            type="button"
            onClick={applyFilters}
            className="rounded-lg bg-primary px-4 py-2 text-on-primary font-medium hover:opacity-90"
          >
            Filtruj
          </button>
        </div>
      </section>

      <p className="text-xs text-on-surface-variant">
        Zoznam = všetky športoviská v DB (Google Places + manuálne). Scrape URL sú voliteľné —
        zo zoznamu zmizne len cez <span className="text-red-300">Odstrániť</span>.
      </p>

      {loading && <p className="text-on-surface-variant">Načítavam športoviská…</p>}
      {error && <p className="text-error">{error}</p>}

      {!loading && !error && venues.length === 0 && (
        <p className="text-on-surface-variant">Žiadne športoviská pre filter.</p>
      )}

      {currentVenue && (
        <section className="space-y-5 rounded-xl border border-white/10 bg-surface-container-low/60 p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-label-caps text-label-caps text-on-surface-variant">
              Športovisko {venueIndex + 1} / {venues.length}
              {total > venues.length ? ` (loaded of ${total})` : ''}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={venueIndex <= 0}
                onClick={() => setVenueIndex((i) => Math.max(0, i - 1))}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Predošlé
              </button>
              <button
                type="button"
                disabled={venueIndex >= venues.length - 1}
                onClick={() => setVenueIndex((i) => Math.min(venues.length - 1, i + 1))}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Ďalšie
              </button>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  {currentVenue.venueName}
                </h2>
                <p className="text-sm text-on-surface-variant mt-1">
                  {[currentVenue.borough, currentVenue.venueCity].filter(Boolean).join(' · ')}
                  {' · '}
                  {scrapePages.length === 0
                    ? 'nescrapujeme'
                    : `${scrapePages.length} scrape URL`}
                  {currentVenue.googlePlaceId ? ' · Google Places' : ''}
                </p>
                {currentVenue.websiteUrl ? (
                  <a
                    href={currentVenue.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-sm break-all hover:underline mt-1 inline-block"
                  >
                    {currentVenue.websiteUrl}
                  </a>
                ) : (
                  <p className="text-sm text-on-surface-variant mt-1">
                    Bez website — nastav v Review → Website URL
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled={removingVenue}
                onClick={() => void removeCurrentVenue()}
                className="rounded-lg border border-red-500/40 text-red-300 px-3 py-1.5 text-sm disabled:opacity-50 shrink-0"
              >
                {removingVenue ? 'Odstraňujem…' : 'Odstrániť'}
              </button>
            </div>

            <div
              className="mt-4 flex gap-1 rounded-lg border border-white/10 bg-background/50 p-1 w-fit"
              role="tablist"
              aria-label="Admin Reviewer"
            >
              {(
                [
                  ['scrape', 'Scrape'],
                  ['review', 'Review'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={`rounded-md px-4 py-1.5 text-sm transition-colors ${
                    tab === key
                      ? 'bg-primary/20 text-primary'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {tab === 'review' ? (
            <VenueAdminDossier
              key={currentVenue.venueId}
              venueId={currentVenue.venueId}
              borough={currentVenue.borough ?? undefined}
              embedded
              onVenueUpdated={(patch) => {
                setVenues((prev) =>
                  prev.map((v) =>
                    v.venueId === currentVenue.venueId
                      ? {
                          ...v,
                          venueName: patch.name?.trim() || v.venueName,
                          websiteUrl: patch.websiteUrl,
                          borough: patch.district ?? v.borough,
                        }
                      : v,
                  ),
                );
              }}
            />
          ) : (
            <>
          <div className="space-y-4">
            <p className="text-sm font-medium text-on-surface">Stránky na scrape</p>
            <p className="text-xs text-on-surface-variant">
              Tu sú len URL, ktoré cron skutočne scrapuje. Website v Review je samostatný údaj
              športoviska — do scrapu ho pridaj manuálne nižšie.
            </p>
            {scrapePages.length === 0 && (
              <p className="text-sm text-on-surface-variant rounded-lg border border-dashed border-white/15 px-3 py-3">
                Nič nescrapujeme — pridaj URL nižšie (schedule / availability / tournaments…).
              </p>
            )}
            {[...pagesByKind, ...(otherPages.length ? [{ kind: 'other*', pages: otherPages }] : [])].map(
              (group) => (
                <div key={group.kind} className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-on-surface-variant">
                    {KIND_LABELS[group.kind] ?? group.kind} ({group.pages.length})
                  </p>
                  <ul className="space-y-2">
                    {group.pages.map((page) => {
                      const active = page.id === selectedPage?.id;
                      return (
                        <li
                          key={page.id}
                          className={`rounded-lg border px-3 py-2 ${
                            active
                              ? 'border-primary/50 bg-primary/10'
                              : 'border-white/10 bg-background/40'
                          }`}
                        >
                          <div className="flex flex-wrap items-start gap-2 justify-between">
                            <button
                              type="button"
                              onClick={() => setSelectedPageId(page.id)}
                              className="text-left flex-1 min-w-0"
                            >
                              <span className="text-sm break-all text-on-surface">
                                {page.url}
                              </span>
                              {page.contentSelector && (
                                <span className="block text-xs text-primary mt-0.5 font-mono">
                                  CSS: {page.contentSelector}
                                </span>
                              )}
                              {page.bookingProvider === 'reenio' && (
                                <span className="block text-xs text-amber-200/90 mt-0.5">
                                  Booking: Reenio
                                  {page.bookingSubject
                                    ? ` (${page.bookingSubject})`
                                    : ''}
                                </span>
                              )}
                            </button>
                            <div className="flex flex-wrap gap-1.5 shrink-0">
                              <a
                                href={page.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded border border-white/15 px-2 py-1 text-xs hover:border-primary/40"
                              >
                                Open
                              </a>
                              <button
                                type="button"
                                onClick={() => void toggleEnabled(page)}
                                className="rounded border border-white/15 px-2 py-1 text-xs"
                                title="Prestať scrapovať (zmizne zo zoznamu)"
                              >
                                Vypnúť
                              </button>
                              <button
                                type="button"
                                disabled={deletingId === page.id}
                                onClick={() => void deletePage(page)}
                                className="rounded border border-red-500/40 text-red-300 px-2 py-1 text-xs disabled:opacity-50"
                              >
                                {deletingId === page.id ? '…' : 'Vymazať'}
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ),
            )}
          </div>

          <div className="rounded-lg border border-dashed border-white/20 p-3 space-y-3">
            <p className="text-sm font-medium text-on-surface">
              Pridať URL
            </p>
            <p className="text-xs text-on-surface-variant">
              Pre kalendár kurtov (voľný / obsadený po hodinách) zvol kind{' '}
              <code className="text-primary">availability</code> — neskôr sa zobrazí v Lobby
              daného športu. Rozvrhy lekcií = schedule, turnaje = tournaments, viacdňové detské
              tábory = kids_camps.
            </p>
            <textarea
              className="w-full min-h-[5rem] rounded-lg border border-white/10 bg-background px-3 py-2 font-mono text-xs text-on-surface"
              value={addUrlsDraft}
              onChange={(e) => setAddUrlsDraft(e.target.value)}
              placeholder={`https://example.sk/rezervacie\nhttps://example.sk/kurzy/deti`}
            />
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-sm text-on-surface-variant">
                Kind
                <select
                  className="rounded-lg border border-white/10 bg-surface-container-low px-3 py-2 text-on-surface max-w-md"
                  value={addKind}
                  onChange={(e) => setAddKind(e.target.value)}
                >
                  {ADD_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABELS[k] ?? k}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={addingUrls || !addUrlsDraft.trim()}
                onClick={() => void addSiblingUrls()}
                className="rounded-lg bg-primary px-4 py-2 text-on-primary font-medium disabled:opacity-50"
              >
                {addingUrls ? 'Pridávam…' : 'Pridať URL'}
              </button>
            </div>
            {addMsg && <p className="text-sm text-on-surface-variant">{addMsg}</p>}
          </div>

          {selectedPage && (
            <div className="rounded-lg border border-white/10 bg-background/60 p-3 space-y-3">
              <p className="text-sm font-medium text-on-surface">
                Vybraná stránka — selector / test
              </p>
              <a
                href={selectedPage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-xs break-all hover:underline block"
              >
                {selectedPage.url}
              </a>
              <div className="flex flex-col gap-2 md:flex-row md:items-end">
                <label className="flex flex-col gap-1 text-sm text-on-surface-variant">
                  Kind
                  <select
                    className="rounded-lg border border-white/10 bg-surface-container-low px-3 py-2 text-on-surface max-w-md"
                    value={kindDraft}
                    onChange={(e) => setKindDraft(e.target.value)}
                  >
                    {PAGE_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {KIND_LABELS[k] ?? k}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm text-on-surface-variant">
                  Booking provider
                  <select
                    className="rounded-lg border border-white/10 bg-surface-container-low px-3 py-2 text-on-surface max-w-md"
                    value={bookingProviderDraft}
                    onChange={(e) => setBookingProviderDraft(e.target.value)}
                  >
                    <option value="">Automaticky (Gemini)</option>
                    <option value="reenio">Reenio</option>
                  </select>
                </label>
                {bookingProviderDraft === 'reenio' && (
                  <label className="flex flex-col gap-1 text-sm text-on-surface-variant">
                    Reenio subject
                    <input
                      className="rounded-lg border border-white/10 bg-background px-3 py-2 font-mono text-sm text-on-surface max-w-[12rem]"
                      value={bookingSubjectDraft}
                      onChange={(e) => setBookingSubjectDraft(e.target.value)}
                      placeholder="eterna"
                    />
                  </label>
                )}
                <label className="flex flex-col gap-1 text-sm text-on-surface-variant flex-1">
                  contentSelector (CSS)
                  <input
                    className="rounded-lg border border-white/10 bg-background px-3 py-2 font-mono text-sm text-on-surface"
                    value={selectorDraft}
                    onChange={(e) => setSelectorDraft(e.target.value)}
                    placeholder=".events-list, #turnaje, main …"
                  />
                </label>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveSelected()}
                  className="rounded-lg bg-primary px-4 py-2 text-on-primary font-medium disabled:opacity-50"
                >
                  {saving ? 'Ukladám…' : 'Save'}
                </button>
              </div>
              <p className="text-xs text-on-surface-variant">
                Ak stránka má len Reenio kalendár, nastav Reenio alebo nechaj Auto
                (fallback keď Gemini nemá dáta).
              </p>
              {saveMsg && <p className="text-sm text-on-surface-variant">{saveMsg}</p>}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={previewing}
                  onClick={() => void runPreview()}
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {previewing ? 'Preview…' : 'Preview'}
                </button>
                <button
                  type="button"
                  disabled={extracting || runningScrape}
                  onClick={() => void runExtract()}
                  className="rounded-lg border border-amber-500/40 text-amber-200 px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {extracting ? 'Extract…' : 'Extract (dry)'}
                </button>
                <button
                  type="button"
                  disabled={runningScrape || extracting}
                  onClick={() => void runScrapeWrite()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
                >
                  {runningScrape ? 'Scrapujem…' : 'Scrape & zapíš do Review'}
                </button>
              </div>

              {preview && (
                <div className="rounded-lg border border-white/10 bg-background/80 p-3 space-y-2">
                  <p className="text-sm text-on-surface-variant">
                    {preview.ok ? (
                      <>
                        usedSelector:{' '}
                        <code className="text-primary">{preview.usedSelector ?? '—'}</code>
                        {' · '}
                        matched: {preview.preferredMatched ? 'yes' : 'no'}
                        {' · '}
                        {preview.charCount ?? 0} chars
                      </>
                    ) : (
                      <span className="text-error">{preview.error ?? 'Preview failed'}</span>
                    )}
                  </p>
                  {preview.textPreview && (
                    <pre className="whitespace-pre-wrap break-words text-xs text-on-surface max-h-72 overflow-auto">
                      {preview.textPreview}
                    </pre>
                  )}
                </div>
              )}

              {extract && (
                <div className="rounded-lg border border-white/10 bg-background/80 p-3 space-y-2">
                  {extract.ok ? (
                    <>
                      <p className="text-sm text-on-surface-variant">
                        {extract.eventCount ?? 0} event(s) · no DB write
                      </p>
                      <ul className="space-y-1 text-sm">
                        {(extract.events ?? []).slice(0, 30).map((e, i) => (
                          <li key={`${e.title}-${i}`} className="text-on-surface">
                            <span className="font-medium">{e.title}</span>
                            <span className="text-on-surface-variant">
                              {' '}
                              · {e.startTime}
                              {e.sport ? ` · ${e.sport}` : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="text-sm text-error">{extract.error ?? 'Extract failed'}</p>
                  )}
                </div>
              )}
            </div>
          )}
            </>
          )}
        </section>
      )}
    </div>
  );
}

/** @deprecated Use AdminReviewer */
export const ScrapePagesReview = AdminReviewer;
