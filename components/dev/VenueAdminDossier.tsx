'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { authedFetch } from '@/lib/auth/authed-fetch';
import { GroupClassWeekCalendar } from '@/components/dev/GroupClassWeekCalendar';
import type { GroupClassSchedule, Weekday } from '@/lib/dev/group-class-schedule';
import {
  EVENT_SPORTS,
  EVENT_SPORT_LABELS,
  detectEventSport,
  eventSportsSortedByLabel,
  isEventSport,
  sportDisplayLabel,
  type EventSport,
} from '@/lib/constants/sports';
import { resolveVenueDistrictSlug } from '@/lib/scrape/bratislava-location';

function normalizeVenueSports(raw: string[]): EventSport[] {
  const out: EventSport[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const upper = trimmed.toUpperCase().replace(/[\s-]+/g, '_');
    let code: EventSport | null = null;
    if (isEventSport(upper)) {
      code = upper;
    } else {
      const byLabel = EVENT_SPORTS.find(
        (s) => EVENT_SPORT_LABELS[s].toLowerCase() === trimmed.toLowerCase(),
      );
      if (byLabel) code = byLabel;
      else {
        const detected = detectEventSport(trimmed, 'OTHER');
        // Only keep OTHER if the raw string literally looks like "other/iné"
        if (detected !== 'OTHER' || /^(other|iné|ine)$/i.test(trimmed)) {
          code = detected;
        }
      }
    }
    if (code && !seen.has(code)) {
      seen.add(code);
      out.push(code);
    }
  }
  return out;
}

type ChecklistStatus = 'ok' | 'missing' | 'empty';

type VenueInfo = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string;
  district: string | null;
  sports: string[];
  websiteUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  verified: boolean;
};

type ScrapeRow = {
  id: string;
  url: string;
  kind: string;
  enabled: boolean;
  contentSelector: string | null;
  lastScrapedAt: string | null;
  lastStatus: string | null;
};

type EventListing = {
  id: string;
  title: string;
  sport: string;
  status: string;
  startsAt: string;
  endTime: string | null;
  storedParticipationMode: string;
  effectiveParticipationMode: 'spectator' | 'participate';
  modeMismatch: boolean;
  forKids: boolean;
  forWomen: boolean;
  source: string | null;
  sourceUrl: string | null;
  isGroupClass: boolean;
  isUpcoming: boolean;
};

type TournamentListing = {
  id: string;
  title: string;
  sport: string;
  status: string;
  startsAt: string;
  endsAt: string | null;
  effectiveParticipationMode: 'spectator' | 'participate';
  forKids: boolean;
  forWomen: boolean;
  source: string | null;
  sourceUrl: string | null;
  isUpcoming: boolean;
};

type ScheduleHint = {
  id: string;
  title: string;
  weekday: Weekday;
  start: string;
  forKids: boolean;
  forWomen: boolean;
};

type Overview = {
  venue: VenueInfo;
  scrapes: ScrapeRow[];
  checklist: Record<string, ChecklistStatus>;
  counts: Record<string, number>;
  groupClassSchedule?: GroupClassSchedule;
  scheduleHints?: ScheduleHint[];
  listings: {
    groupClasses: EventListing[];
    events: EventListing[];
    tournaments: TournamentListing[];
  };
};

const CHECKLIST_LABELS: Record<string, string> = {
  website: 'Website',
  address: 'Adresa',
  schedule: 'Schedule URL',
  availability: 'Kalendár kurtov',
  groupClasses: 'Skupinové cvičenia',
  events: 'Eventy',
  tournaments: 'Turnaje',
  kids: 'Deti',
  women: 'Ženy',
};

function chipClass(status: ChecklistStatus): string {
  if (status === 'ok') return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200';
  if (status === 'empty') return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
  return 'border-red-500/40 bg-red-500/10 text-red-300';
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('sk-SK', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function modeBadge(mode: 'spectator' | 'participate'): string {
  return mode === 'spectator' ? 'Sledovať' : 'Hrať';
}

export function VenueAdminDossier({
  venueId,
  borough,
  embedded = false,
  onVenueUpdated,
}: {
  venueId: string;
  borough?: string;
  /** When true: no back link / scrape URLs (shown in Admin Reviewer tabs). */
  embedded?: boolean;
  /** Fired after successful venue field save (header link, borough, …). */
  onVenueUpdated?: (patch: {
    name?: string;
    websiteUrl: string | null;
    district: string | null;
    address: string | null;
  }) => void;
}) {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [district, setDistrict] = useState('');
  const [sports, setSports] = useState<EventSport[]>([]);
  const [sportsOpen, setSportsOpen] = useState(false);
  const [savingVenue, setSavingVenue] = useState(false);
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'kids' | 'women'>('all');
  const [patchingId, setPatchingId] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [listingPeek, setListingPeek] = useState<'events' | 'tournaments' | null>(null);
  const [schedule, setSchedule] = useState<GroupClassSchedule>({
    areas: [],
    slots: [],
  });
  const [scheduleHints, setScheduleHints] = useState<ScheduleHint[]>([]);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch(`/api/dev/venues/${venueId}/overview`);
      const json = (await res.json()) as Overview & { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json);
      setVenueName(json.venue.name ?? '');
      setAddress(json.venue.address ?? '');
      setWebsiteUrl(json.venue.websiteUrl ?? '');
      setDistrict(json.venue.district ?? '');
      setSports(normalizeVenueSports(json.venue.sports ?? []));
      setSchedule(json.groupClassSchedule ?? { areas: [], slots: [] });
      setScheduleHints(json.scheduleHints ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveVenue = async () => {
    setSavingVenue(true);
    setMsg(null);
    try {
      const res = await authedFetch(`/api/dev/venues/${venueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: venueName,
          address,
          websiteUrl,
          district,
          sports,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        venue?: {
          name?: string;
          websiteUrl?: string | null;
          district?: string | null;
          address?: string | null;
        };
      };
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setMsg('Venue uložené');
      const nextName = json.venue?.name?.trim() || venueName.trim();
      if (nextName) setVenueName(nextName);
      onVenueUpdated?.({
        name: nextName || undefined,
        websiteUrl: json.venue?.websiteUrl ?? (websiteUrl.trim() || null),
        district: json.venue?.district ?? (district.trim() || null),
        address: json.venue?.address ?? (address.trim() || null),
      });
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingVenue(false);
    }
  };

  const saveSchedule = async () => {
    setSavingSchedule(true);
    setScheduleMsg(null);
    try {
      const res = await authedFetch(`/api/dev/venues/${venueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupClassSchedule: schedule,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        groupClassSchedule?: GroupClassSchedule;
      };
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setSchedule(json.groupClassSchedule ?? schedule);
      setScheduleMsg('Rozvrh uložený');
      await load();
    } catch (err) {
      setScheduleMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingSchedule(false);
    }
  };

  const patchListing = async (
    type: 'event' | 'tournament',
    id: string,
    body: Record<string, unknown>,
  ) => {
    setPatchingId(id);
    setMsg(null);
    try {
      const res = await authedFetch(`/api/dev/listings/${type}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setMsg('Uložené');
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setPatchingId(null);
    }
  };

  if (loading) {
    return <p className="text-on-surface-variant">Načítavam dossier…</p>;
  }
  if (error || !data) {
    return <p className="text-error">{error ?? 'Chyba'}</p>;
  }

  const { venue, scrapes, checklist, counts, listings } = data;
  const scrapeBack =
    borough != null && borough !== ''
      ? `/dev/scrape-pages?borough=${encodeURIComponent(borough)}&tab=review`
      : '/dev/scrape-pages?tab=review';

  const filterAudience = <T extends { forKids: boolean; forWomen: boolean; isUpcoming?: boolean }>(
    rows: T[],
  ) => {
    const active = rows.filter((r) => r.isUpcoming !== false);
    if (audienceFilter === 'kids') return active.filter((r) => r.forKids);
    if (audienceFilter === 'women') return active.filter((r) => r.forWomen);
    return active;
  };

  const scrapesByKind = scrapes.reduce<Record<string, ScrapeRow[]>>((acc, s) => {
    const key = s.kind.includes(',') ? `mixed: ${s.kind}` : s.kind;
    (acc[key] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className={embedded ? 'space-y-6' : 'space-y-8'}>
      {!embedded && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              {venue.name}
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              {[venue.district, venue.city].filter(Boolean).join(' · ')}
              {venue.verified ? ' · verified' : ''}
            </p>
          </div>
          <Link
            href={scrapeBack}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:border-primary/40"
          >
            Admin Reviewer
          </Link>
        </div>
      )}

      <section className="flex flex-wrap gap-1.5">
        {Object.entries(CHECKLIST_LABELS).map(([key, label]) => {
          const status = checklist[key] ?? 'missing';
          const chipCls = `rounded-md border px-2 py-0.5 text-[11px] ${chipClass(status)}`;
          if (key === 'groupClasses') {
            const n = counts.groupClasses ?? 0;
            const slots = counts.scheduleSlots ?? 0;
            return (
              <button
                key={key}
                type="button"
                title="Otvoriť týždenný kalendár"
                onClick={() => {
                  setListingPeek(null);
                  setShowSchedule((v) => !v);
                }}
                className={`${chipCls} hover:ring-1 hover:ring-primary/50 transition-shadow ${
                  showSchedule ? 'ring-1 ring-primary/60' : ''
                }`}
              >
                {label}
                {n > 0 ? ` · ${n}` : slots > 0 ? ` · ${slots}` : ''}
              </button>
            );
          }
          if (key === 'events' || key === 'tournaments') {
            const peek = key as 'events' | 'tournaments';
            const n = key === 'events' ? counts.events : counts.tournaments;
            const open = listingPeek === peek;
            return (
              <button
                key={key}
                type="button"
                title={key === 'events' ? 'Zoznam eventov' : 'Zoznam turnajov'}
                onClick={() => {
                  setShowSchedule(false);
                  setListingPeek((cur) => (cur === peek ? null : peek));
                }}
                className={`${chipCls} hover:ring-1 hover:ring-primary/50 transition-shadow ${
                  open ? 'ring-1 ring-primary/60' : ''
                }`}
              >
                {label}
                {typeof n === 'number' ? ` · ${n}` : ''}
              </button>
            );
          }
          return (
            <span key={key} className={chipCls} title={key}>
              {label}
            </span>
          );
        })}
      </section>

      {listingPeek && (
        <ListingPeekPanel
          kind={listingPeek}
          events={listings.events}
          tournaments={listings.tournaments}
          onClose={() => setListingPeek(null)}
        />
      )}

      {showSchedule && (
        <GroupClassWeekCalendar
          venueId={venueId}
          schedule={schedule}
          onChange={setSchedule}
          onSave={() => void saveSchedule()}
          saving={savingSchedule}
          saveMsg={scheduleMsg}
          venueSports={venue.sports}
          hints={scheduleHints}
          onClose={() => setShowSchedule(false)}
          onPersisted={() => void load()}
        />
      )}

      <p className="text-xs text-on-surface-variant">
        Skupinové {counts.groupClasses}
        <span className="text-on-surface-variant/70">
          {' '}
          ({counts.upcomingGroupClasses} ↑)
        </span>
        {typeof counts.scheduleSlots === 'number' && counts.scheduleSlots > 0
          ? ` · Rozvrh ${counts.scheduleSlots}`
          : ''}
        {' · '}Eventy {counts.events}
        {' · '}Turnaje {counts.tournaments}
        {' · '}Hrať {counts.playCount}
        {' · '}Sledovať {counts.watchCount}
        {' · '}Deti {counts.kidsCount}
        {' · '}Ženy {counts.womenCount}
      </p>

      <details open className="rounded-xl border border-white/10 bg-background/40 p-4 group">
        <summary className="cursor-pointer text-sm font-medium text-on-surface list-none flex items-center justify-between gap-3">
          <span className="shrink-0">Športovisko</span>
          <span
            className="material-symbols-outlined text-on-surface-variant text-[18px] group-open:rotate-180 transition-transform shrink-0"
            aria-hidden
          >
            expand_more
          </span>
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-on-surface-variant md:col-span-2">
            Názov
            <input
              className="rounded-lg border border-white/10 bg-background px-3 py-2 text-on-surface font-medium"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="Názov športoviska"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-on-surface-variant">
            Adresa
            <input
              className="rounded-lg border border-white/10 bg-background px-3 py-2 text-on-surface"
              value={address}
              onChange={(e) => {
                const next = e.target.value;
                setAddress(next);
                const resolved = resolveVenueDistrictSlug(next, venueName);
                if (resolved) setDistrict(resolved);
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-on-surface-variant">
            District
            <input
              className="rounded-lg border border-white/10 bg-background px-3 py-2 text-on-surface"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="ruzinov"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-on-surface-variant md:col-span-2">
            Website URL
            <input
              className="rounded-lg border border-white/10 bg-background px-3 py-2 text-on-surface font-mono text-sm"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-on-surface-variant md:col-span-2">
            Športy
            <div className="relative">
              <button
                type="button"
                aria-expanded={sportsOpen}
                aria-haspopup="listbox"
                onClick={() => setSportsOpen((o) => !o)}
                className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-background px-3 py-2 text-left text-on-surface hover:border-white/25"
              >
                <span className="flex-1 min-w-0 truncate text-sm">
                  {sports.length === 0
                    ? 'Vyber športy…'
                    : sports.map((s) => sportDisplayLabel(s)).join(', ')}
                </span>
                <span
                  className={`material-symbols-outlined text-base text-on-surface-variant transition-transform ${
                    sportsOpen ? 'rotate-180' : ''
                  }`}
                >
                  expand_more
                </span>
              </button>
              {sportsOpen && (
                <div
                  className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-white/10 bg-surface-container-low p-2 shadow-2xl shadow-black/50"
                  role="listbox"
                  aria-label="Športy v aplikácii"
                  aria-multiselectable
                >
                  <div className="flex flex-wrap gap-1.5">
                    {eventSportsSortedByLabel().map((sport) => {
                      const active = sports.includes(sport);
                      return (
                        <button
                          key={sport}
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => {
                            setSports((prev) =>
                              prev.includes(sport)
                                ? prev.filter((s) => s !== sport)
                                : [...prev, sport],
                            );
                          }}
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                            active
                              ? 'border-primary/50 bg-primary/20 text-primary'
                              : 'border-white/15 text-on-surface-variant hover:border-white/30 hover:text-on-surface'
                          }`}
                        >
                          {sportDisplayLabel(sport)}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex justify-end gap-2 border-t border-white/10 pt-2">
                    {sports.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSports([])}
                        className="rounded-lg border border-white/15 px-3 py-1 text-xs text-on-surface-variant"
                      >
                        Vymazať
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSportsOpen(false)}
                      className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-on-primary"
                    >
                      Hotovo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </label>
        </div>
        <button
          type="button"
          disabled={savingVenue}
          onClick={() => void saveVenue()}
          className="mt-3 rounded-lg bg-primary px-4 py-2 text-on-primary font-medium disabled:opacity-50"
        >
          {savingVenue ? 'Ukladám…' : 'Uložiť venue'}
        </button>
      </details>

      {!embedded && (
        <section className="space-y-3">
          <p className="text-sm font-medium text-on-surface">
            Scrape URL ({counts.scrapesEnabled}/{counts.scrapesTotal} enabled)
          </p>
          {Object.keys(scrapesByKind).length === 0 && (
            <p className="text-sm text-on-surface-variant">Žiadne scrape pages.</p>
          )}
          {Object.entries(scrapesByKind).map(([kind, rows]) => (
            <div key={kind} className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-on-surface-variant">
                {kind} ({rows.length})
              </p>
              <ul className="space-y-1">
                {rows.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-lg border border-white/10 bg-background/40 px-3 py-2 text-xs"
                  >
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`break-all hover:underline ${
                        s.enabled ? 'text-on-surface' : 'text-on-surface-variant line-through'
                      }`}
                    >
                      {s.url}
                    </a>
                    {s.contentSelector && (
                      <span className="block text-primary font-mono mt-0.5">
                        CSS: {s.contentSelector}
                      </span>
                    )}
                    {s.lastStatus && (
                      <span className="block text-on-surface-variant mt-0.5">
                        {s.lastStatus}
                        {s.lastScrapedAt ? ` · ${formatWhen(s.lastScrapedAt)}` : ''}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['all', 'Všetko'],
            ['kids', 'Deti'],
            ['women', 'Ženy'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setAudienceFilter(key)}
            className={`rounded-md border px-3 py-1 text-xs ${
              audienceFilter === key
                ? 'border-primary/50 bg-primary/15 text-primary'
                : 'border-white/15 text-on-surface-variant'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {msg && <p className="text-sm text-on-surface-variant">{msg}</p>}

      <ListingSection
        title="Skupinové cvičenia + čas"
        empty="Žiadne skupinové cvičenia."
      >
        {filterAudience(listings.groupClasses).map((row) => (
          <EventRow
            key={row.id}
            row={row}
            busy={patchingId === row.id}
            onPatch={(body) => void patchListing('event', row.id, body)}
          />
        ))}
      </ListingSection>

      <ListingSection title="Eventy" empty="Žiadne eventy.">
        {filterAudience(listings.events).map((row) => (
          <EventRow
            key={row.id}
            row={row}
            busy={patchingId === row.id}
            onPatch={(body) => void patchListing('event', row.id, body)}
          />
        ))}
      </ListingSection>

      <ListingSection title="Turnaje" empty="Žiadne turnaje.">
        {filterAudience(listings.tournaments).map((row) => (
          <TournamentRow
            key={row.id}
            row={row}
            busy={patchingId === row.id}
            onPatch={(body) => void patchListing('tournament', row.id, body)}
          />
        ))}
      </ListingSection>
    </div>
  );
}

function ListingPeekPanel({
  kind,
  events,
  tournaments,
  onClose,
}: {
  kind: 'events' | 'tournaments';
  events: EventListing[];
  tournaments: TournamentListing[];
  onClose: () => void;
}) {
  const isEvents = kind === 'events';
  const rows = (isEvents ? events : tournaments).filter((r) => r.isUpcoming);
  const title = isEvents ? 'Eventy' : 'Turnaje';
  const empty = isEvents ? 'Žiadne eventy zapísané.' : 'Žiadne turnaje zapísané.';

  return (
    <div className="max-w-md rounded-lg border border-white/15 bg-background/80 px-3 py-2 space-y-2 shadow-lg shadow-black/30">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-on-surface">
          {title}
          <span className="text-on-surface-variant font-normal"> · {rows.length}</span>
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-on-surface-variant hover:text-on-surface"
        >
          Zavrieť
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="text-[11px] text-on-surface-variant py-1">{empty}</p>
      ) : (
        <ul className="max-h-48 overflow-y-auto divide-y divide-white/5">
          {rows.map((row) => {
            const href = isEvents ? `/events/${row.id}` : `/tournaments/${row.id}`;
            return (
              <li key={row.id} className="py-1.5 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[12px] text-on-surface leading-snug truncate">
                      {row.title}
                    </p>
                    <p className="text-[10px] text-on-surface-variant mt-0.5">
                      {formatWhen(row.startsAt)}
                      {' · '}
                      {row.sport}
                      {!row.isUpcoming ? ' · past' : ''}
                      {row.forKids ? ' · Deti' : ''}
                      {row.forWomen ? ' · Ženy' : ''}
                    </p>
                  </div>
                  <Link
                    href={href}
                    className="shrink-0 text-[10px] text-primary hover:underline pt-0.5"
                  >
                    App
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ListingSection({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const childArray = Array.isArray(children) ? children : children ? [children] : [];
  const has = childArray.length > 0;
  return (
    <section className="space-y-2">
      <p className="text-sm font-medium text-on-surface">{title}</p>
      {!has ? (
        <p className="text-sm text-on-surface-variant">{empty}</p>
      ) : (
        <ul className="space-y-2">{children}</ul>
      )}
    </section>
  );
}

function EventRow({
  row,
  busy,
  onPatch,
}: {
  row: EventListing;
  busy: boolean;
  onPatch: (body: Record<string, unknown>) => void;
}) {
  return (
    <li className="rounded-lg border border-white/10 bg-surface-container-low/50 p-3 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-on-surface font-medium">{row.title}</p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {formatWhen(row.startsAt)} · {row.sport} · {row.status}
            {!row.isUpcoming ? ' · past' : ''}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <span className="rounded border border-white/15 px-1.5 py-0.5 text-[10px]">
              Feed: {modeBadge(row.effectiveParticipationMode)}
            </span>
            <span className="rounded border border-white/15 px-1.5 py-0.5 text-[10px]">
              DB: {row.storedParticipationMode === 'spectator' ? 'Sledovať' : 'Hrať'}
            </span>
            {row.modeMismatch && (
              <span className="rounded border border-amber-500/40 text-amber-200 px-1.5 py-0.5 text-[10px]">
                feed podľa názvu ≠ DB
              </span>
            )}
            {row.forKids && (
              <span className="rounded border border-sky-500/40 text-sky-200 px-1.5 py-0.5 text-[10px]">
                Deti
              </span>
            )}
            {row.forWomen && (
              <span className="rounded border border-pink-500/40 text-pink-200 px-1.5 py-0.5 text-[10px]">
                Ženy
              </span>
            )}
          </div>
          {row.sourceUrl && (
            <a
              href={row.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-primary break-all hover:underline mt-1 inline-block"
            >
              {row.sourceUrl}
            </a>
          )}
        </div>
        <Link
          href={`/events/${row.id}`}
          className="text-xs text-primary hover:underline shrink-0"
        >
          App
        </Link>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => onPatch({ forKids: !row.forKids })}
          className="rounded border border-white/15 px-2 py-1 text-[11px] disabled:opacity-50"
        >
          {row.forKids ? '− Deti' : '+ Deti'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onPatch({ forWomen: !row.forWomen })}
          className="rounded border border-white/15 px-2 py-1 text-[11px] disabled:opacity-50"
        >
          {row.forWomen ? '− Ženy' : '+ Ženy'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onPatch({
              participationMode:
                row.storedParticipationMode === 'spectator' ? 'participate' : 'spectator',
            })
          }
          className="rounded border border-white/15 px-2 py-1 text-[11px] disabled:opacity-50"
        >
          DB → {row.storedParticipationMode === 'spectator' ? 'Hrať' : 'Sledovať'}
        </button>
        <button
          type="button"
          disabled={busy || row.status === 'cancelled'}
          onClick={() => onPatch({ status: 'cancelled' })}
          className="rounded border border-red-500/40 text-red-300 px-2 py-1 text-[11px] disabled:opacity-50"
        >
          Cancel
        </button>
        {row.status === 'cancelled' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onPatch({ status: 'open' })}
            className="rounded border border-white/15 px-2 py-1 text-[11px] disabled:opacity-50"
          >
            Reopen
          </button>
        )}
      </div>
    </li>
  );
}

function TournamentRow({
  row,
  busy,
  onPatch,
}: {
  row: TournamentListing;
  busy: boolean;
  onPatch: (body: Record<string, unknown>) => void;
}) {
  return (
    <li className="rounded-lg border border-white/10 bg-surface-container-low/50 p-3 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-on-surface font-medium">{row.title}</p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {formatWhen(row.startsAt)} · {row.sport} · {row.status}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <span className="rounded border border-white/15 px-1.5 py-0.5 text-[10px]">
              {modeBadge(row.effectiveParticipationMode)}
            </span>
            {row.forKids && (
              <span className="rounded border border-sky-500/40 text-sky-200 px-1.5 py-0.5 text-[10px]">
                Deti
              </span>
            )}
            {row.forWomen && (
              <span className="rounded border border-pink-500/40 text-pink-200 px-1.5 py-0.5 text-[10px]">
                Ženy
              </span>
            )}
          </div>
        </div>
        <Link
          href={`/tournaments/${row.id}`}
          className="text-xs text-primary hover:underline shrink-0"
        >
          App
        </Link>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => onPatch({ forKids: !row.forKids })}
          className="rounded border border-white/15 px-2 py-1 text-[11px] disabled:opacity-50"
        >
          {row.forKids ? '− Deti' : '+ Deti'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onPatch({ forWomen: !row.forWomen })}
          className="rounded border border-white/15 px-2 py-1 text-[11px] disabled:opacity-50"
        >
          {row.forWomen ? '− Ženy' : '+ Ženy'}
        </button>
        <button
          type="button"
          disabled={busy || row.status === 'CANCELLED'}
          onClick={() => onPatch({ status: 'CANCELLED' })}
          className="rounded border border-red-500/40 text-red-300 px-2 py-1 text-[11px] disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </li>
  );
}
