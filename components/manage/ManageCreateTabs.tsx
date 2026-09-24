'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useT } from '@/components/i18n/LocaleProvider';
import { ManageSection } from '@/components/manage/ManageNavList';
import { LobbySchedulePicker } from '@/components/lobby/LobbySchedulePicker';
import type { OrganizerVenueOption } from '@/lib/data/organizer-venues';
import { EVENT_SPORTS } from '@/lib/constants/sports';
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
  /** Owned venue id, or empty when using custom place text. */
  venueId: string;
  place: string;
  placeMode: 'venue' | 'custom';
  price: string;
  description: string;
  audience: AudienceKey;
  /** External page the app will deep-link / CTA to. */
  link: string;
  /** Camp turnusy — only used when kind === camp. */
  sessions: CampSessionDraft[];
}

const EMPTY_DRAFT: ListingDraft = {
  title: '',
  sport: 'PADEL',
  date: '',
  time: '',
  venueId: '',
  place: '',
  placeMode: 'venue',
  price: '',
  description: '',
  audience: 'all',
  link: '',
  sessions: [],
};

function freshDraft(venues: OrganizerVenueOption[], kind?: CreateChipId | null): ListingDraft {
  const primary = venues[0];
  const isCamp = kind === 'camp';
  return {
    ...EMPTY_DRAFT,
    date: toDateKey(new Date()),
    time: '18:00',
    placeMode: primary ? 'venue' : 'custom',
    venueId: primary?.id ?? '',
    place: primary ? `${primary.name}, ${primary.city}` : '',
    audience: isCamp ? 'kids' : 'all',
    sessions: isCamp ? defaultCampSessions() : [],
  };
}

interface ManageCreateTabsProps {
  venues: OrganizerVenueOption[];
}

export function ManageCreateTabs({ venues }: ManageCreateTabsProps) {
  const t = useT();
  const router = useRouter();
  const [activeId, setActiveId] = useState<CreateChipId | null>(null);
  const [draft, setDraft] = useState<ListingDraft>(() => freshDraft(venues, null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const visibleChips = useMemo(() => {
    if (!activeId) return CHIPS;
    const selected = CHIPS.find((c) => c.id === activeId);
    return selected ? [selected] : CHIPS;
  }, [activeId]);

  const activeChip = CHIPS.find((c) => c.id === activeId) ?? null;
  const isCamp = activeId === 'camp';

  useEffect(() => {
    // Keep draft venue in sync if owned venues load/change — never invent foreign ids.
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
  }, [venues]);

  function selectChip(id: CreateChipId) {
    setError(null);
    setNote(null);
    if (activeId === id) {
      setActiveId(null);
      return;
    }
    setDraft(freshDraft(venues, id));
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
    if (!usingVenue && !draft.place.trim()) {
      setError(t('manage.form.placeRequired'));
      setSaving(false);
      return;
    }

    const priceNum = draft.price.trim() ? Number(draft.price) : 0;
    const desc = draft.description.trim() || draft.title.trim();
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
      link: draft.link.trim(),
    };
    if (isCamp) {
      payload.sessions = draft.sessions
        .filter((s) => s.startDate)
        .map((s) => ({
          date: s.startDate,
          endDate: s.endDate && s.endDate >= s.startDate ? s.endDate : s.startDate,
        }));
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
                {t('manage.form.sharedHint', { type: t(activeChip.labelKey) })}
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
                <select
                  id="manage-sport"
                  value={draft.sport}
                  onChange={(e) => update('sport', e.target.value)}
                  className={fieldClass}
                >
                  {EVENT_SPORTS.map((sport) => (
                    <option key={sport} value={sport}>
                      {sport}
                    </option>
                  ))}
                </select>
              </div>

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
                          {draft.sessions.length > 1 ? (
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
                  {draft.sessions.length < MAX_CAMP_SESSIONS ? (
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
                    onDateChange={(date) => update('date', date)}
                    onTimeChange={(time) => update('time', time)}
                  />
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

              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-secondary/40 bg-secondary/15 font-label-caps text-[11px] uppercase tracking-[0.12em] text-secondary transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? t('manage.form.saving') : t('manage.form.publish')}
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
