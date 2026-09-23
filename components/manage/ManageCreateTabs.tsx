'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useT } from '@/components/i18n/LocaleProvider';
import { ManageSection } from '@/components/manage/ManageNavList';
import type { OrganizerVenueOption } from '@/lib/data/organizer-venues';
import { EVENT_SPORTS } from '@/lib/constants/sports';
import type { MessageKey } from '@/lib/i18n/messages';
import type { ListingKind } from '@/lib/ai/listing-from-image-types';

export type ManageCreateTabId = ListingKind;

interface CreateTab {
  id: ManageCreateTabId;
  icon: string;
  labelKey: MessageKey;
  accent: 'primary' | 'secondary' | 'programs';
}

const ACCENT: Record<CreateTab['accent'], { chip: string; chipActive: string; icon: string }> = {
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

const TABS: CreateTab[] = [
  { id: 'event', icon: 'event', labelKey: 'manage.create.event', accent: 'primary' },
  { id: 'tournament', icon: 'emoji_events', labelKey: 'manage.create.tournament', accent: 'secondary' },
  { id: 'camp', icon: 'camping', labelKey: 'manage.create.camp', accent: 'programs' },
  { id: 'workshop', icon: 'school', labelKey: 'manage.create.workshop', accent: 'programs' },
  { id: 'course', icon: 'menu_book', labelKey: 'manage.create.course', accent: 'programs' },
];

const fieldClass =
  'w-full rounded-lg border border-outline-variant/40 bg-surface-container-high px-3 py-2.5 font-body-md text-sm text-on-surface focus:border-secondary focus:outline-none';

interface SharedListingDraft {
  title: string;
  sport: string;
  date: string;
  time: string;
  endDate: string;
  endTime: string;
  venueId: string;
  place: string;
  price: string;
  capacity: string;
  link: string;
  description: string;
}

const EMPTY_DRAFT: SharedListingDraft = {
  title: '',
  sport: 'PADEL',
  date: '',
  time: '',
  endDate: '',
  endTime: '',
  venueId: '',
  place: '',
  price: '',
  capacity: '',
  link: '',
  description: '',
};

interface ManageCreateTabsProps {
  venues: OrganizerVenueOption[];
}

export function ManageCreateTabs({ venues }: ManageCreateTabsProps) {
  const t = useT();
  const [activeTab, setActiveTab] = useState<ManageCreateTabId | null>(null);
  const [draft, setDraft] = useState<SharedListingDraft>(EMPTY_DRAFT);
  const [note, setNote] = useState<string | null>(null);

  const selected = TABS.find((tab) => tab.id === activeTab) ?? null;
  const showEnd = activeTab === 'camp' || activeTab === 'course' || Boolean(draft.endDate);
  const formTypeLabel = selected ? t(selected.labelKey) : t('manage.create.event');

  useEffect(() => {
    if (venues.length === 1 && !draft.venueId) {
      setDraft((prev) => ({
        ...prev,
        venueId: venues[0]!.id,
        place: prev.place || venues[0]!.name,
      }));
    }
  }, [venues, draft.venueId]);

  function selectTab(id: ManageCreateTabId) {
    setActiveTab((prev) => (prev === id ? null : id));
    setNote(null);
  }

  function update<K extends keyof SharedListingDraft>(key: K, value: SharedListingDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setNote(null);
  }

  function onVenueChange(venueId: string) {
    const venue = venues.find((v) => v.id === venueId);
    setDraft((prev) => ({
      ...prev,
      venueId,
      place: venue ? `${venue.name}, ${venue.city}` : prev.place,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNote(t('manage.form.savedLocal'));
  }

  return (
    <ManageSection title={t('manage.section.create')}>
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const accent = ACCENT[tab.accent];
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={active}
              onClick={() => selectTab(tab.id)}
              className={[
                'inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 py-2',
                'font-label-caps text-[10px] uppercase tracking-[0.1em]',
                'transition-[transform,border-color,background-color] active:scale-[0.97]',
                active ? accent.chipActive : accent.chip,
              ].join(' ')}
            >
              <span className={`material-symbols-outlined text-[16px] ${active ? accent.icon : ''}`}>
                {tab.icon}
              </span>
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {selected ? (
          <motion.div
            key={selected.id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleSubmit}
              className="mt-3 space-y-4 rounded-2xl border border-white/8 bg-surface-container p-4"
            >
              <p className="font-body-md text-sm text-on-surface-variant">
                {t('manage.form.sharedHint', { type: formTypeLabel })}
              </p>

              <div className="space-y-1">
                <label
                  className="font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant"
                  htmlFor="manage-title"
                >
                  {t('manage.form.title')}
                </label>
                <input
                  id="manage-title"
                  required
                  value={draft.title}
                  onChange={(e) => update('title', e.target.value)}
                  className={fieldClass}
                  placeholder={t('manage.form.titlePh')}
                />
              </div>

              <div className="space-y-1">
                <label
                  className="font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant"
                  htmlFor="manage-sport"
                >
                  {t('manage.form.sport')}
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    className="font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant"
                    htmlFor="manage-date"
                  >
                    {t('manage.form.date')}
                  </label>
                  <input
                    id="manage-date"
                    type="date"
                    required
                    value={draft.date}
                    onChange={(e) => update('date', e.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1">
                  <label
                    className="font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant"
                    htmlFor="manage-time"
                  >
                    {t('manage.form.time')}
                  </label>
                  <input
                    id="manage-time"
                    type="time"
                    required
                    value={draft.time}
                    onChange={(e) => update('time', e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>

              {showEnd ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label
                      className="font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant"
                      htmlFor="manage-end-date"
                    >
                      {t('manage.form.endDate')}
                    </label>
                    <input
                      id="manage-end-date"
                      type="date"
                      value={draft.endDate}
                      onChange={(e) => update('endDate', e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      className="font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant"
                      htmlFor="manage-end-time"
                    >
                      {t('manage.form.endTime')}
                    </label>
                    <input
                      id="manage-end-time"
                      type="time"
                      value={draft.endTime}
                      onChange={(e) => update('endTime', e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                </div>
              ) : null}

              {venues.length > 0 ? (
                <div className="space-y-1">
                  <label
                    className="font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant"
                    htmlFor="manage-venue"
                  >
                    {t('manage.form.place')}
                  </label>
                  <select
                    id="manage-venue"
                    value={draft.venueId}
                    onChange={(e) => onVenueChange(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">{t('manage.form.placePick')}</option>
                    {venues.map((venue) => (
                      <option key={venue.id} value={venue.id}>
                        {venue.name} · {venue.city}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1">
                  <label
                    className="font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant"
                    htmlFor="manage-place"
                  >
                    {t('manage.form.place')}
                  </label>
                  <input
                    id="manage-place"
                    value={draft.place}
                    onChange={(e) => update('place', e.target.value)}
                    className={fieldClass}
                    placeholder={t('manage.form.placePh')}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
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
                    htmlFor="manage-capacity"
                  >
                    {t('manage.form.capacity')}
                  </label>
                  <input
                    id="manage-capacity"
                    type="number"
                    min={0}
                    value={draft.capacity}
                    onChange={(e) => update('capacity', e.target.value)}
                    className={fieldClass}
                    placeholder="—"
                  />
                </div>
              </div>

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
                  value={draft.link}
                  onChange={(e) => update('link', e.target.value)}
                  className={fieldClass}
                  placeholder="https://"
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

              <button
                type="submit"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-secondary/40 bg-secondary/15 font-label-caps text-[11px] uppercase tracking-[0.12em] text-secondary transition-transform active:scale-[0.98]"
              >
                {t('manage.form.save')}
              </button>

              {note ? <p className="font-body-md text-xs text-secondary">{note}</p> : null}
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </ManageSection>
  );
}
