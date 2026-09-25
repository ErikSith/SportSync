'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useT } from '@/components/i18n/LocaleProvider';
import { ManageSection } from '@/components/manage/ManageNavList';
import { LobbySchedulePicker } from '@/components/lobby/LobbySchedulePicker';
import { SportTypeahead } from '@/components/manage/SportTypeahead';
import type { OrganizerVenueOption } from '@/lib/data/organizer-venues';
import { isEventSport } from '@/lib/constants/sports';
import type { MessageKey } from '@/lib/i18n/messages';
import { addCalendarDays, toDateKey } from '@/lib/event-date-filter';

type CreateChipId =
  | 'event'
  | 'tournament'
  | 'group_class'
  | 'camp'
  | 'workshop'
  | 'course';

type AudienceKey = 'all' | 'women' | 'kids' | 'men';
type ParticipationKey = 'participate' | 'spectator';

interface CampSessionDraft {
  /** Local id for React keys — not persisted. */
  key: string;
  startDate: string;
  endDate: string;
}

interface CreateChip {
  id: CreateChipId;
  icon: string;
  labelKey: MessageKey;
  accent: 'primary' | 'secondary' | 'programs';
}

const CHIPS: CreateChip[] = [
  { id: 'event', icon: 'event', labelKey: 'manage.create.event', accent: 'primary' },
  { id: 'tournament', icon: 'emoji_events', labelKey: 'manage.create.tournament', accent: 'secondary' },
  { id: 'group_class', icon: 'fitness_center', labelKey: 'manage.create.groupClass', accent: 'programs' },
  { id: 'camp', icon: 'camping', labelKey: 'manage.create.camp', accent: 'programs' },
  { id: 'workshop', icon: 'school', labelKey: 'manage.create.workshop', accent: 'programs' },
  { id: 'course', icon: 'menu_book', labelKey: 'manage.create.course', accent: 'programs' },
];

const ACCENT: Record<
  CreateChip['accent'],
  { chip: string; chipActive: string; icon: string }
> = {
  primary: {
    chip: 'border-white/10 bg-surface-container text-on-surface-variant',
    chipActive: 'border-primary-container/45 bg-primary-container/15 text-on-surface',
    icon: 'text-primary-container',
  },
  secondary: {
    chip: 'border-white/10 bg-surface-container text-on-surface-variant',
    chipActive: 'border-secondary/45 bg-secondary/15 text-on-surface',
    icon: 'text-secondary',
  },
  programs: {
    chip: 'border-white/10 bg-surface-container text-on-surface-variant',
    chipActive: 'border-teal-400/40 bg-teal-400/10 text-on-surface',
    icon: 'text-teal-300',
  },
};

const AUDIENCE_OPTIONS: Array<{ key: AudienceKey; labelKey: MessageKey }> = [
  { key: 'all', labelKey: 'manage.form.audience.all' },
  { key: 'women', labelKey: 'manage.form.audience.women' },
  { key: 'men', labelKey: 'manage.form.audience.men' },
  { key: 'kids', labelKey: 'manage.form.audience.kids' },
];

const PARTICIPATION_OPTIONS: Array<{
  key: ParticipationKey;
  labelKey: MessageKey;
  hintKey: MessageKey;
}> = [
  {
    key: 'participate',
    labelKey: 'manage.form.participation.players',
    hintKey: 'manage.form.participation.joinHint',
  },
  {
    key: 'spectator',
    labelKey: 'manage.form.participation.spectators',
    hintKey: 'manage.form.participation.watchHint',
  },
];

const fieldClass =
  'w-full rounded-lg border border-outline-variant/40 bg-surface-container-high px-3 py-2.5 font-body-md text-sm text-on-surface focus:border-secondary focus:outline-none';

const MAX_CAMP_SESSIONS = 12;

function newSessionKey(): string {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function defaultCampSessions(): CampSessionDraft[] {
  // Default first turnus next week so "start must be in the future" always holds.
  const start = addCalendarDays(toDateKey(new Date()), 7) ?? toDateKey(new Date());
  const end = addCalendarDays(start, 4) ?? start;
  return [{ key: newSessionKey(), startDate: start, endDate: end }];
}

interface ListingDraft {
  title: string;
  sport: string;
  date: string;
  time: string;
  /** Optional last calendar day for multi-day workshops (YYYY-MM-DD). */
  endDate: string;
  /** Owned venue id, or empty when using custom place text. */
  venueId: string;
  place: string;
  placeMode: 'venue' | 'custom';
  price: string;
  description: string;
  audience: AudienceKey;
  /** Pripojiť sa (join) vs Sledovať (watch-only). */
  participation: ParticipationKey;
  /** External page the app will deep-link / CTA to. */
  link: string;
  /** Camp turnusy — only used when kind === camp. */
  sessions: CampSessionDraft[];
}

const EMPTY_DRAFT: ListingDraft = {
  title: '',
  sport: '',
  date: '',
  time: '',
  endDate: '',
  venueId: '',
  place: '',
  placeMode: 'venue',
  price: '',
  description: '',
  audience: 'all',
  participation: 'participate',
  link: '',
  sessions: [],
};

function freshDraft(venues: OrganizerVenueOption[], kind?: CreateChipId | null): ListingDraft {
  const primary = venues[0];
  const isCamp = kind === 'camp';
  const today = toDateKey(new Date());
  return {
    ...EMPTY_DRAFT,
    date: today,
    time: '18:00',
    endDate: today,
    placeMode: primary ? 'venue' : 'custom',
    venueId: primary?.id ?? '',
    place: primary ? `${primary.name}, ${primary.city}` : '',
    audience: isCamp ? 'kids' : 'all',
    sessions: isCamp ? defaultCampSessions() : [],
  };
}

interface ManageCreateTabsProps {
  venues: OrganizerVenueOption[];
  editTarget?: { entityKind: 'event' | 'tournament'; id: string } | null;
  onEditLoaded?: () => void;
  onEditClear?: () => void;
}

type ListingApiPayload = {
  ok?: boolean;
  kind: 'event' | 'tournament';
  createKind: CreateChipId;
  id: string;
  title: string;
  sport: string;
  date: string;
  time: string;
  endDate: string | null;
  venueId: string | null;
  place: string;
  price: number;
  description: string;
  audience: AudienceKey;
  participation: ParticipationKey;
  link: string;
  coverUrl?: string | null;
  error?: string;
};

function stripPlaceSuffix(description: string): string {
  return description.replace(/\n\nMiesto:\s*[^\n]*$/u, '').trim();
}

function draftFromListing(
  listing: ListingApiPayload,
  venues: OrganizerVenueOption[],
): ListingDraft {
  const venueId = listing.venueId ?? '';
  const owned = venueId ? venues.find((v) => v.id === venueId) : undefined;
  const placeMode: 'venue' | 'custom' = owned ? 'venue' : 'custom';
  const endDate = listing.endDate && listing.endDate >= listing.date
    ? listing.endDate
    : listing.date;
  const isCamp = listing.createKind === 'camp';

  return {
    title: listing.title,
    sport: listing.sport,
    date: listing.date,
    time: listing.time || '09:00',
    endDate,
    venueId: owned ? owned.id : '',
    place: owned
      ? `${owned.name}, ${owned.city}`
      : listing.place.trim(),
    placeMode,
    price: listing.price > 0 ? String(listing.price) : '',
    description: stripPlaceSuffix(listing.description),
    audience: listing.audience,
    participation: listing.participation === 'spectator' ? 'spectator' : 'participate',
    link: listing.link ?? '',
    sessions: isCamp
      ? [{ key: newSessionKey(), startDate: listing.date, endDate }]
      : [],
  };
}

export function ManageCreateTabs({
  venues,
  editTarget = null,
  onEditLoaded,
  onEditClear,
}: ManageCreateTabsProps) {
  const t = useT();
  const router = useRouter();
  const [activeId, setActiveId] = useState<CreateChipId | null>(null);
  const [draft, setDraft] = useState<ListingDraft>(() => freshDraft(venues, null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    entityKind: 'event' | 'tournament';
    id: string;
  } | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerCleared, setBannerCleared] = useState(false);

  function resetBanner(nextUrl: string | null = null) {
    setBannerPreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return nextUrl;
    });
    setBannerFile(null);
    setBannerCleared(false);
  }

  function pickBannerFile(file: File | null) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
      setError(t('manage.form.bannerError'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t('manage.form.bannerError'));
      return;
    }
    setBannerPreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setBannerFile(file);
    setBannerCleared(false);
    setError(null);
    setNote(null);
  }

  function clearBanner() {
    setBannerPreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
    setBannerFile(null);
    setBannerCleared(true);
    setError(null);
    setNote(null);
  }

  const visibleChips = useMemo(() => {
    if (!activeId) return CHIPS;
    const selected = CHIPS.find((c) => c.id === activeId);
    return selected ? [selected] : CHIPS;
  }, [activeId]);

  const activeChip = CHIPS.find((c) => c.id === activeId) ?? null;
  const isCamp = activeId === 'camp';
  const isWorkshop = activeId === 'workshop';
  /** Play vs watch only for oficiálny event / turnaj — programs stay Hrať. */
  const showParticipation = activeId === 'event' || activeId === 'tournament';
  const isEditing = Boolean(editing);

  useEffect(() => {
    // Keep draft venue in sync if owned venues load/change — never invent foreign ids.
    // Skip while editing an existing listing (venue comes from the listing).
    if (editing || loadingEdit) return;
    setDraft((prev) => {
      if (prev.placeMode === 'custom') return prev;
      if (prev.venueId && venues.some((v) => v.id === prev.venueId)) return prev;
      const primary = venues[0];
      if (!primary) {
        return { ...prev, placeMode: 'custom', venueId: '', place: prev.place };
      }
      return {
        ...prev,
        placeMode: 'venue',
        venueId: primary.id,
        place: `${primary.name}, ${primary.city}`,
      };
    });
  }, [venues, editing, loadingEdit]);

  useEffect(() => {
    if (!editTarget) return;
    let cancelled = false;

    async function loadEdit() {
      setLoadingEdit(true);
      setError(null);
      setNote(null);
      try {
        const res = await fetch(
          `/api/manage/listings/${editTarget!.entityKind}/${editTarget!.id}`,
        );
        const body = (await res.json().catch(() => null)) as ListingApiPayload | null;
        if (cancelled) return;
        if (!res.ok || !body?.id) {
          setError(body?.error ?? t('manage.edit.loadError'));
          onEditLoaded?.();
          onEditClear?.();
          return;
        }
        setEditing({ entityKind: body.kind, id: body.id });
        setActiveId(body.createKind);
        setDraft(draftFromListing(body, venues));
        resetBanner(body.coverUrl ?? null);
        onEditLoaded?.();
      } catch {
        if (!cancelled) {
          setError(t('manage.edit.loadError'));
          onEditLoaded?.();
          onEditClear?.();
        }
      } finally {
        if (!cancelled) setLoadingEdit(false);
      }
    }

    void loadEdit();
    return () => {
      cancelled = true;
    };
    // Only react to editTarget identity — venues captured at load time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTarget?.entityKind, editTarget?.id]);

  function clearEditState() {
    setEditing(null);
    onEditClear?.();
  }

  function selectChip(id: CreateChipId) {
    setError(null);
    setNote(null);
    if (activeId === id) {
      setActiveId(null);
      clearEditState();
      resetBanner(null);
      return;
    }
    clearEditState();
    setDraft(freshDraft(venues, id));
    resetBanner(null);
    setActiveId(id);
  }

  function update<K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setError(null);
    setNote(null);
  }

  function updateSession(
    key: string,
    patch: Partial<Pick<CampSessionDraft, 'startDate' | 'endDate'>>,
  ) {
    setDraft((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) => {
        if (s.key !== key) return s;
        const next = { ...s, ...patch };
        if (next.endDate && next.startDate && next.endDate < next.startDate) {
          next.endDate = next.startDate;
        }
        return next;
      }),
    }));
    setError(null);
    setNote(null);
  }

  function addSession() {
    setDraft((prev) => {
      if (prev.sessions.length >= MAX_CAMP_SESSIONS) return prev;
      const last = prev.sessions[prev.sessions.length - 1];
      const start =
        last?.endDate
          ? addCalendarDays(last.endDate, 7) ?? toDateKey(new Date())
          : toDateKey(new Date());
      const end = addCalendarDays(start, 4) ?? start;
      return {
        ...prev,
        sessions: [...prev.sessions, { key: newSessionKey(), startDate: start, endDate: end }],
      };
    });
    setError(null);
    setNote(null);
  }

  function removeSession(key: string) {
    setDraft((prev) => ({
      ...prev,
      sessions: prev.sessions.length <= 1 ? prev.sessions : prev.sessions.filter((s) => s.key !== key),
    }));
    setError(null);
    setNote(null);
  }

  function pickOwnedVenue(venueId: string) {
    const venue = venues.find((v) => v.id === venueId);
    if (!venue) return;
    setDraft((prev) => ({
      ...prev,
      placeMode: 'venue',
      venueId: venue.id,
      place: `${venue.name}, ${venue.city}`,
    }));
    setError(null);
    setNote(null);
  }

  function pickCustomPlace() {
    setDraft((prev) => ({
      ...prev,
      placeMode: 'custom',
      venueId: '',
      place: prev.placeMode === 'custom' ? prev.place : '',
    }));
    setError(null);
    setNote(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId) return;

    setSaving(true);
    setError(null);
    setNote(null);

    if (isCamp) {
      const validSessions = draft.sessions.filter((s) => s.startDate);
      if (validSessions.length === 0) {
        setError(t('manage.form.sessionsRequired'));
        setSaving(false);
        return;
      }
    } else if (!draft.date || !draft.time) {
      setError(t('manage.form.scheduleRequired'));
      setSaving(false);
      return;
    }

    const usingVenue = draft.placeMode === 'venue' && Boolean(draft.venueId);
    if (usingVenue && !venues.some((v) => v.id === draft.venueId)) {
      setError(t('manage.form.placeOwnedOnly'));
      setSaving(false);
      return;
    }
    if (!usingVenue && !draft.place.trim() && !(isEditing && !draft.venueId)) {
      setError(t('manage.form.placeRequired'));
      setSaving(false);
      return;
    }

    if (!isEventSport(draft.sport)) {
      setError(t('manage.form.sportRequired'));
      setSaving(false);
      return;
    }

    const priceNum = draft.price.trim() ? Number(draft.price) : 0;
    const desc = draft.description.trim() || draft.title.trim();

    let coverUrl: string | null | undefined = undefined;
    if (bannerFile) {
      const formData = new FormData();
      formData.append('file', bannerFile);
      const uploadRes = await fetch('/api/manage/listings/banner', {
        method: 'POST',
        body: formData,
      });
      const uploadBody = (await uploadRes.json().catch(() => null)) as {
        error?: string;
        coverUrl?: string;
      } | null;
      if (!uploadRes.ok || !uploadBody?.coverUrl) {
        setError(uploadBody?.error ?? t('manage.form.bannerError'));
        setSaving(false);
        return;
      }
      coverUrl = uploadBody.coverUrl;
    } else if (isEditing && bannerCleared) {
      coverUrl = null;
    }

    if (isEditing && editing) {
      const patchPayload: Record<string, unknown> = {
        title: draft.title.trim(),
        sport: draft.sport,
        date: isCamp ? draft.sessions[0]?.startDate ?? draft.date : draft.date,
        time: isCamp ? '09:00' : draft.time,
        venueId: usingVenue ? draft.venueId : null,
        place: usingVenue ? '' : draft.place.trim(),
        price: Number.isFinite(priceNum) ? Math.max(0, priceNum) : 0,
        description: desc,
        audience: draft.audience,
        participation: showParticipation ? draft.participation : 'participate',
        link: draft.link.trim(),
      };
      if (coverUrl !== undefined) {
        patchPayload.coverUrl = coverUrl;
      }
      if (isCamp) {
        const session = draft.sessions[0];
        if (session?.startDate) {
          patchPayload.date = session.startDate;
          patchPayload.endDate =
            session.endDate && session.endDate >= session.startDate
              ? session.endDate
              : session.startDate;
        }
      } else if (isWorkshop && draft.endDate && draft.endDate >= draft.date) {
        patchPayload.endDate = draft.endDate;
      }

      const res = await fetch(
        `/api/manage/listings/${editing.entityKind}/${editing.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchPayload),
        },
      );

      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;

      setSaving(false);

      if (!res.ok) {
        setError(body?.error ?? t('manage.form.saveError'));
        return;
      }

      setNote(t('manage.form.saved'));
      setDraft(freshDraft(venues, null));
      resetBanner(null);
      setActiveId(null);
      clearEditState();
      router.refresh();
      return;
    }

    const payload: Record<string, unknown> = {
      kind: activeId,
      title: draft.title.trim(),
      sport: draft.sport,
      date: isCamp ? draft.sessions[0]?.startDate ?? draft.date : draft.date,
      time: isCamp ? '09:00' : draft.time,
      venueId: usingVenue ? draft.venueId : null,
      place: usingVenue ? '' : draft.place.trim(),
      price: Number.isFinite(priceNum) ? Math.max(0, priceNum) : 0,
      description: desc,
      audience: draft.audience,
      participation: showParticipation ? draft.participation : 'participate',
      link: draft.link.trim(),
    };
    if (coverUrl) {
      payload.coverUrl = coverUrl;
    }
    if (isCamp) {
      payload.sessions = draft.sessions
        .filter((s) => s.startDate)
        .map((s) => ({
          date: s.startDate,
          endDate: s.endDate && s.endDate >= s.startDate ? s.endDate : s.startDate,
        }));
    } else if (isWorkshop && draft.endDate && draft.endDate >= draft.date) {
      payload.endDate = draft.endDate;
    }

    const res = await fetch('/api/manage/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const body = (await res.json().catch(() => null)) as {
      error?: string;
      href?: string;
      id?: string;
    } | null;

    setSaving(false);

    if (!res.ok || !body?.href) {
      setError(body?.error ?? t('manage.form.saveError'));
      return;
    }

    setNote(t('manage.form.saved'));
    setDraft(freshDraft(venues, null));
    resetBanner(null);
    setActiveId(null);
    router.push(body.href);
    router.refresh();
  }

  return (
    <ManageSection title={t('manage.section.create')}>
      <div className="flex flex-wrap gap-2">
        {visibleChips.map((chip) => {
          const accent = ACCENT[chip.accent];
          const active = activeId === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              aria-pressed={active}
              onClick={() => selectChip(chip.id)}
              className={[
                'inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 py-2',
                'font-label-caps text-[10px] uppercase tracking-[0.1em]',
                'transition-[transform,border-color,background-color] active:scale-[0.97]',
                active ? accent.chipActive : accent.chip,
              ].join(' ')}
            >
              <span className={`material-symbols-outlined text-[16px] ${active ? accent.icon : ''}`}>
                {chip.icon}
              </span>
              {t(chip.labelKey)}
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {activeChip ? (
          <motion.div
            key={activeChip.id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="mt-3 space-y-4 rounded-2xl border border-white/8 bg-surface-container p-4"
            >
              <p className="font-body-md text-sm text-on-surface-variant">
                {isEditing
                  ? t('manage.edit.formHint', { type: t(activeChip.labelKey) })
                  : t('manage.form.sharedHint', { type: t(activeChip.labelKey) })}
              </p>

              <div className="space-y-1">
                <label
                  className="font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant"
                  htmlFor="manage-title"
                >
                  {t('manage.form.eventTitle')}
                </label>
                <input
                  id="manage-title"
                  required
                  value={draft.title}
                  onChange={(e) => update('title', e.target.value)}
                  className={fieldClass}
                  placeholder={
                    isCamp ? t('manage.form.campTitlePh') : t('manage.form.titlePh')
                  }
                />
              </div>

              <div className="space-y-1">
                <label
                  className="font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant"
                  htmlFor="manage-sport"
                >
                  {t('manage.form.sportType')}
                </label>
                <SportTypeahead
                  id="manage-sport"
                  value={draft.sport}
                  onChange={(sport) => update('sport', sport)}
                  className={fieldClass}
                />
              </div>

              {showParticipation ? (
                <fieldset className="space-y-2">
                  <legend className="font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant">
                    {t('manage.form.participation')}
                  </legend>
                  <div className="grid grid-cols-2 gap-2">
                    {PARTICIPATION_OPTIONS.map((option) => {
                      const selected = draft.participation === option.key;
                      return (
                        <button
                          key={option.key}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => update('participation', option.key)}
                          className={[
                            'inline-flex min-h-11 flex-col items-start justify-center rounded-xl border px-3 py-2.5',
                            'text-left transition-colors',
                            selected
                              ? 'border-secondary/45 bg-secondary/15 text-secondary'
                              : 'border-white/10 bg-surface-container-high text-on-surface-variant',
                          ].join(' ')}
                        >
                          <span className="font-label-caps text-[10px] uppercase tracking-[0.08em]">
                            {t(option.labelKey)}
                          </span>
                          <span className="mt-0.5 font-body-md text-[11px] leading-snug text-on-surface-variant">
                            {t(option.hintKey)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ) : null}

              {isCamp ? (
                <fieldset className="space-y-2">
                  <legend className="font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant">
                    {t('manage.form.turnusy')}
                  </legend>
                  <p className="font-body-md text-xs text-on-surface-variant">
                    {t('manage.form.turnusHint')}
                  </p>
                  <ul className="space-y-2">
                    {draft.sessions.map((session, index) => (
                      <li
                        key={session.key}
                        className="rounded-xl border border-white/8 bg-surface-container-high/60 p-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="font-label-caps text-[10px] uppercase tracking-[0.1em] text-teal-300/90">
                            {t('manage.form.turnusy')} {index + 1}
                          </span>
                          {draft.sessions.length > 1 && !isEditing ? (
                            <button
                              type="button"
                              onClick={() => removeSession(session.key)}
                              className="font-label-caps text-[9px] uppercase tracking-wider text-on-surface-variant hover:text-error"
                            >
                              {t('manage.form.turnusRemove')}
                            </button>
                          ) : null}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label
                              className="font-label-caps text-[9px] uppercase tracking-wide text-on-surface-variant"
                              htmlFor={`manage-session-start-${session.key}`}
                            >
                              {t('manage.form.turnusStart')}
                            </label>
                            <input
                              id={`manage-session-start-${session.key}`}
                              type="date"
                              required
                              value={session.startDate}
                              onChange={(e) =>
                                updateSession(session.key, { startDate: e.target.value })
                              }
                              className={fieldClass}
                            />
                          </div>
                          <div className="space-y-1">
                            <label
                              className="font-label-caps text-[9px] uppercase tracking-wide text-on-surface-variant"
                              htmlFor={`manage-session-end-${session.key}`}
                            >
                              {t('manage.form.turnusEnd')}
                            </label>
                            <input
                              id={`manage-session-end-${session.key}`}
                              type="date"
                              required
                              min={session.startDate || undefined}
                              value={session.endDate}
                              onChange={(e) =>
                                updateSession(session.key, { endDate: e.target.value })
                              }
                              className={fieldClass}
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {draft.sessions.length < MAX_CAMP_SESSIONS && !isEditing ? (
                    <button
                      type="button"
                      onClick={addSession}
                      className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-full border border-teal-400/30 bg-teal-400/10 px-3 font-label-caps text-[10px] uppercase tracking-[0.1em] text-teal-200 transition-transform active:scale-[0.98]"
                    >
                      <span className="material-symbols-outlined text-[16px]" aria-hidden>
                        add
                      </span>
                      {t('manage.form.turnusAdd')}
                    </button>
                  ) : null}
                </fieldset>
              ) : (
                <div className="space-y-2">
                  <p className="font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant">
                    {t('manage.form.schedule')}
                  </p>
                  <LobbySchedulePicker
                    date={draft.date}
                    time={draft.time}
                    onDateChange={(date) => {
                      update('date', date);
                      if (isWorkshop && (!draft.endDate || draft.endDate < date)) {
                        update('endDate', date);
                      }
                    }}
                    onTimeChange={(time) => update('time', time)}
                  />
                  {isWorkshop ? (
                    <div className="space-y-1 pt-1">
                      <label
                        className="font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant"
                        htmlFor="manage-workshop-end"
                      >
                        {t('manage.form.endDate')}
                      </label>
                      <input
                        id="manage-workshop-end"
                        type="date"
                        min={draft.date || undefined}
                        value={draft.endDate || draft.date}
                        onChange={(e) => {
                          const next = e.target.value;
                          update(
                            'endDate',
                            draft.date && next < draft.date ? draft.date : next,
                          );
                        }}
                        className={fieldClass}
                      />
                      <p className="font-body-md text-xs text-on-surface-variant">
                        {t('manage.form.workshopRangeHint')}
                      </p>
                    </div>
                  ) : null}
                </div>
              )}

              <fieldset className="space-y-2">
                <legend className="font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant">
                  {t('manage.form.place')}
                </legend>
                {venues.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {venues.map((venue) => {
                      const selected =
                        draft.placeMode === 'venue' && draft.venueId === venue.id;
                      return (
                        <button
                          key={venue.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => pickOwnedVenue(venue.id)}
                          className={[
                            'inline-flex min-h-9 max-w-full items-center rounded-full border px-3 py-1.5',
                            'font-label-caps text-[10px] uppercase tracking-[0.08em]',
                            selected
                              ? 'border-secondary/45 bg-secondary/15 text-secondary'
                              : 'border-white/10 bg-surface-container-high text-on-surface-variant',
                          ].join(' ')}
                        >
                          <span className="truncate">{venue.name}</span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      aria-pressed={draft.placeMode === 'custom'}
                      onClick={pickCustomPlace}
                      className={[
                        'inline-flex min-h-9 items-center rounded-full border px-3 py-1.5',
                        'font-label-caps text-[10px] uppercase tracking-[0.08em]',
                        draft.placeMode === 'custom'
                          ? 'border-secondary/45 bg-secondary/15 text-secondary'
                          : 'border-white/10 bg-surface-container-high text-on-surface-variant',
                      ].join(' ')}
                    >
                      {t('manage.form.placeOther')}
                    </button>
                  </div>
                ) : null}

                {draft.placeMode === 'custom' || venues.length === 0 ? (
                  <input
                    id="manage-place"
                    value={draft.place}
                    onChange={(e) => update('place', e.target.value)}
                    className={fieldClass}
                    placeholder={t('manage.form.placePh')}
                    required={draft.placeMode === 'custom' || venues.length === 0}
                  />
                ) : null}

                {venues.length === 0 ? (
                  <p className="font-body-md text-xs text-on-surface-variant">
                    {t('manage.form.placeNoOwned')}
                  </p>
                ) : null}
              </fieldset>

              <div className="space-y-1">
                <label
                  className="font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant"
                  htmlFor="manage-price"
                >
                  {t('manage.form.price')}
                </label>
                <input
                  id="manage-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft.price}
                  onChange={(e) => update('price', e.target.value)}
                  className={fieldClass}
                  placeholder="0"
                />
              </div>

              <div className="space-y-1">
                <label
                  className="font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant"
                  htmlFor="manage-desc"
                >
                  {t('manage.form.description')}
                </label>
                <textarea
                  id="manage-desc"
                  rows={3}
                  value={draft.description}
                  onChange={(e) => update('description', e.target.value)}
                  className={`${fieldClass} resize-y`}
                  placeholder={t('manage.form.descriptionPh')}
                />
              </div>

              <fieldset className="space-y-2">
                <legend className="font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant">
                  {t('manage.form.audience')}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {AUDIENCE_OPTIONS.map((option) => {
                    const selected = draft.audience === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => update('audience', option.key)}
                        className={[
                          'inline-flex min-h-9 items-center rounded-full border px-3 py-1.5',
                          'font-label-caps text-[10px] uppercase tracking-[0.08em]',
                          selected
                            ? 'border-secondary/45 bg-secondary/15 text-secondary'
                            : 'border-white/10 bg-surface-container-high text-on-surface-variant',
                        ].join(' ')}
                      >
                        {t(option.labelKey)}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="space-y-1">
                <label
                  className="font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant"
                  htmlFor="manage-link"
                >
                  {t('manage.form.link')}
                </label>
                <input
                  id="manage-link"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  value={draft.link}
                  onChange={(e) => update('link', e.target.value)}
                  className={fieldClass}
                  placeholder={t('manage.form.linkPh')}
                />
              </div>

              <div className="space-y-2">
                <p className="font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant">
                  {t('manage.form.banner')}
                </p>
                <p className="font-body-md text-xs text-on-surface-variant">
                  {t('manage.form.bannerHint')}
                </p>
                {bannerPreview ? (
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-surface-container-high">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bannerPreview}
                      alt=""
                      className="h-36 w-full object-cover"
                    />
                    <div className="flex gap-2 border-t border-white/8 p-2">
                      <label className="inline-flex min-h-9 flex-1 cursor-pointer items-center justify-center rounded-full border border-white/12 bg-surface-container px-3 font-label-caps text-[10px] uppercase tracking-[0.1em] text-on-surface transition-transform active:scale-[0.98]">
                        {t('manage.form.bannerChange')}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="sr-only"
                          disabled={saving}
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            pickBannerFile(file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={clearBanner}
                        className="inline-flex min-h-9 flex-1 items-center justify-center rounded-full border border-white/12 px-3 font-label-caps text-[10px] uppercase tracking-[0.1em] text-on-surface-variant transition-transform active:scale-[0.98] hover:text-error"
                      >
                        {t('manage.form.bannerRemove')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-surface-container-high/50 px-3 font-label-caps text-[10px] uppercase tracking-[0.1em] text-on-surface-variant transition-colors hover:border-secondary/40 hover:text-secondary">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden>
                      add_photo_alternate
                    </span>
                    {t('manage.form.banner')}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      disabled={saving}
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        pickBannerFile(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-secondary/40 bg-secondary/15 font-label-caps text-[11px] uppercase tracking-[0.12em] text-secondary transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                {saving
                  ? bannerFile
                    ? t('manage.form.bannerUploading')
                    : t('manage.form.saving')
                  : isEditing
                    ? t('manage.edit.save')
                    : t('manage.form.publish')}
              </button>

              {error ? <p className="font-body-md text-xs text-error">{error}</p> : null}
              {note ? <p className="font-body-md text-xs text-secondary">{note}</p> : null}
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </ManageSection>
  );
}
