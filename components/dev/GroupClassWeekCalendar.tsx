'use client';

import { useMemo, useRef, useState } from 'react';
import { authedFetch } from '@/lib/auth/authed-fetch';
import {
  EVENT_SPORTS,
  EVENT_SPORT_LABELS,
  type EventSport,
} from '@/lib/constants/sports';
import {
  WEEKDAYS,
  WEEKDAY_LABELS,
  emptyArea,
  emptySlot,
  isValidTime,
  normalizeTime,
  type GroupClassArea,
  type GroupClassSchedule,
  type GroupClassSlot,
  type Weekday,
} from '@/lib/dev/group-class-schedule';

type Props = {
  venueId: string;
  schedule: GroupClassSchedule;
  onChange: (schedule: GroupClassSchedule) => void;
  onSave: () => void | Promise<void>;
  saving: boolean;
  saveMsg: string | null;
  venueSports?: string[];
  hints?: Array<{
    id: string;
    title: string;
    weekday: Weekday;
    start: string;
    forKids: boolean;
    forWomen: boolean;
  }>;
  onClose: () => void;
  onPersisted?: () => void;
};

export function GroupClassWeekCalendar({
  venueId,
  schedule,
  onChange,
  onSave,
  saving,
  saveMsg,
  venueSports = [],
  hints = [],
  onClose,
  onPersisted,
}: Props) {
  const { areas, slots } = schedule;
  const [draftTitle, setDraftTitle] = useState<Record<string, string>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeMsg, setAnalyzeMsg] = useState<string | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(
    () => areas[0]?.id ?? null,
  );
  const [addingArea, setAddingArea] = useState(areas.length === 0);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaSport, setNewAreaSport] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Keep selection valid when areas list changes (load / AI / delete).
  if (selectedAreaId && !areas.some((a) => a.id === selectedAreaId)) {
    setSelectedAreaId(areas[0]?.id ?? null);
  } else if (!selectedAreaId && areas[0]) {
    setSelectedAreaId(areas[0].id);
  }

  const visibleSlots = useMemo(
    () =>
      selectedAreaId
        ? slots.filter((s) => s.areaId === selectedAreaId)
        : [],
    [slots, selectedAreaId],
  );

  const byDay = useMemo(() => {
    const map = new Map<Weekday, GroupClassSlot[]>();
    for (const d of WEEKDAYS) map.set(d, []);
    for (const s of visibleSlots) {
      map.get(s.weekday)?.push(s);
    }
    for (const d of WEEKDAYS) {
      map.get(d)?.sort((a, b) => a.start.localeCompare(b.start));
    }
    return map;
  }, [visibleSlots]);

  const hintsByDay = useMemo(() => {
    const map = new Map<Weekday, typeof hints>();
    for (const d of WEEKDAYS) map.set(d, []);
    for (const h of hints) {
      map.get(h.weekday)?.push(h);
    }
    return map;
  }, [hints]);

  const areaById = useMemo(() => {
    const m = new Map<string, GroupClassArea>();
    for (const a of areas) m.set(a.id, a);
    return m;
  }, [areas]);

  const setSlots = (next: GroupClassSlot[]) => onChange({ areas, slots: next });
  const setAreas = (next: GroupClassArea[]) => onChange({ areas: next, slots });

  const updateSlot = (id: string, patch: Partial<GroupClassSlot>) => {
    setSlots(slots.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeSlot = (id: string) => {
    setSlots(slots.filter((s) => s.id !== id));
  };

  const addSlot = (weekday: Weekday) => {
    if (!selectedAreaId) return;
    setSlots([...slots, emptySlot(weekday, selectedAreaId)]);
  };

  const adoptHint = (hint: (typeof hints)[number]) => {
    if (!selectedAreaId) return;
    setSlots([
      ...slots,
      {
        ...emptySlot(hint.weekday, selectedAreaId),
        title: hint.title,
        start: hint.start,
        end: suggestEnd(hint.start),
        forKids: hint.forKids,
        forWomen: hint.forWomen,
      },
    ]);
  };

  const createArea = () => {
    const name = newAreaName.trim();
    if (!name) return;
    const area = emptyArea(name, newAreaSport.trim());
    setAreas([...areas, area]);
    setSelectedAreaId(area.id);
    setNewAreaName('');
    setNewAreaSport('');
    setAddingArea(false);
  };

  const renameArea = (id: string, name: string) => {
    setAreas(areas.map((a) => (a.id === id ? { ...a, name } : a)));
  };

  const setAreaSport = (id: string, sport: string) => {
    setAreas(areas.map((a) => (a.id === id ? { ...a, sport } : a)));
  };

  const removeArea = (id: string) => {
    const ok = window.confirm('Odstrániť túto halu a jej sloty z rozvrhu?');
    if (!ok) return;
    const nextAreas = areas.filter((a) => a.id !== id);
    const nextSlots = slots.filter((s) => s.areaId !== id);
    onChange({ areas: nextAreas, slots: nextSlots });
    setSelectedAreaId(nextAreas[0]?.id ?? null);
    if (nextAreas.length === 0) setAddingArea(true);
  };

  const analyzePhoto = async (file: File) => {
    if (!selectedAreaId) {
      setAnalyzeMsg('Najprv vytvor / vyber halu.');
      return;
    }
    setAnalyzing(true);
    setAnalyzeMsg(null);
    try {
      const body = new FormData();
      body.append('image', file);
      body.append('areaId', selectedAreaId);
      const res = await authedFetch(
        `/api/dev/venues/${venueId}/schedule-from-image?save=1`,
        { method: 'POST', body },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        schedule?: GroupClassSchedule;
        slots?: GroupClassSlot[];
        areas?: GroupClassArea[];
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      const next: GroupClassSchedule = json.schedule ?? {
        areas: json.areas ?? areas,
        slots: json.slots ?? [],
      };
      onChange(next);
      const hallCount = next.slots.filter((s) => s.areaId === selectedAreaId).length;
      setAnalyzeMsg(
        hallCount > 0
          ? `AI zapísala rozvrh do hály · uložené`
          : 'AI nič nenašla na fotke',
      );
      onPersisted?.();
    } catch (err) {
      setAnalyzeMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setAnalyzing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const editingArea = selectedAreaId ? areaById.get(selectedAreaId) : null;

  return (
    <div className="rounded-xl border border-primary/30 bg-background/70 p-3 md:p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-on-surface">Týždenný rozvrh</p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            1) vytvor halu · 2) Fotka → AI vypíše kalendár
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void analyzePhoto(f);
            }}
          />
          <button
            type="button"
            disabled={analyzing || saving || !selectedAreaId}
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-sm disabled:opacity-50 inline-flex items-center gap-1.5"
            title={
              selectedAreaId
                ? 'AI zapíše rozvrh do vybranej hály'
                : 'Najprv vytvor halu'
            }
          >
            <span className="material-symbols-outlined text-[16px]">photo_camera</span>
            {analyzing ? 'AI…' : 'Fotka → AI'}
          </button>
          <button
            type="button"
            disabled={saving || analyzing}
            onClick={() => void onSave()}
            className="rounded-lg bg-primary px-3 py-1.5 text-on-primary text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Ukladám…' : 'Uložiť rozvrh'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-on-surface-variant"
          >
            Zavrieť
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {areas.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setSelectedAreaId(a.id)}
            className={`rounded-md border px-2 py-1 text-[11px] max-w-[12rem] truncate ${
              selectedAreaId === a.id
                ? 'border-primary/50 bg-primary/15 text-primary'
                : 'border-white/15 text-on-surface-variant'
            }`}
            title={a.sport ? `${a.name} (${a.sport})` : a.name}
          >
            {a.name}
            {a.sport ? <span className="opacity-60"> · {a.sport}</span> : null}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setAddingArea((v) => !v)}
          className="rounded-md border border-dashed border-white/25 px-2 py-1 text-[11px] text-primary hover:bg-primary/10"
        >
          + Hála / šport
        </button>
      </div>

      {addingArea && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-white/20 p-2">
          <label className="flex flex-col gap-0.5 text-[10px] text-on-surface-variant">
            Názov hály / zóny
            <input
              className="rounded border border-white/10 bg-background px-2 py-1 text-[12px] text-on-surface min-w-[8rem]"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              placeholder="Hala A / Yoga studio"
              onKeyDown={(e) => {
                if (e.key === 'Enter') createArea();
              }}
            />
          </label>
          <label className="flex flex-col gap-0.5 text-[10px] text-on-surface-variant">
            Šport (voliteľné)
            <SportSelect
              value={newAreaSport}
              onChange={setNewAreaSport}
              preferSports={venueSports}
            />
          </label>
          <button
            type="button"
            onClick={createArea}
            disabled={!newAreaName.trim()}
            className="rounded-lg bg-primary px-3 py-1.5 text-on-primary text-xs disabled:opacity-50"
          >
            Pridať
          </button>
        </div>
      )}

      {editingArea && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-white/10 bg-background/40 px-2 py-1.5">
          <label className="flex flex-col gap-0.5 text-[10px] text-on-surface-variant">
            Hála
            <input
              className="rounded border border-white/10 bg-background px-2 py-1 text-[12px] text-on-surface"
              value={editingArea.name}
              onChange={(e) => renameArea(editingArea.id, e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-0.5 text-[10px] text-on-surface-variant">
            Šport
            <SportSelect
              value={editingArea.sport}
              onChange={(v) => setAreaSport(editingArea.id, v)}
              preferSports={venueSports}
            />
          </label>
          <button
            type="button"
            onClick={() => removeArea(editingArea.id)}
            className="rounded border border-red-500/30 text-red-300 px-2 py-1 text-[11px]"
          >
            Odstrániť halu
          </button>
        </div>
      )}

      {(analyzeMsg || saveMsg) && (
        <p className="text-xs text-on-surface-variant">{analyzeMsg ?? saveMsg}</p>
      )}

      {!selectedAreaId ? (
        <p className="text-sm text-on-surface-variant py-6 text-center">
          Najprv pridaj halu cez <span className="text-primary">+ Hála / šport</span>, potom
          pošli fotku do AI.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
          {WEEKDAYS.map((day) => {
            const daySlots = byDay.get(day) ?? [];
            const dayHints = hintsByDay.get(day) ?? [];
            return (
              <div
                key={day}
                className="rounded-lg border border-white/10 bg-surface-container-low/50 p-2 min-h-[8rem] flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-on-surface">
                    {WEEKDAY_LABELS[day]}
                  </span>
                  <button
                    type="button"
                    onClick={() => addSlot(day)}
                    className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary/10"
                    title="Pridať slot"
                  >
                    +
                  </button>
                </div>

                <ul className="space-y-2 flex-1">
                  {daySlots.map((slot) => (
                    <li
                      key={slot.id}
                      className="rounded-md border border-white/10 bg-background/60 p-1.5 space-y-1.5"
                    >
                      <input
                        className="w-full rounded border border-white/10 bg-transparent px-1.5 py-1 text-[11px] text-on-surface placeholder:text-on-surface-variant/60"
                        placeholder="Názov (Pilates…)"
                        value={draftTitle[slot.id] ?? slot.title}
                        onChange={(e) =>
                          setDraftTitle((prev) => ({ ...prev, [slot.id]: e.target.value }))
                        }
                        onBlur={() => {
                          const next = (draftTitle[slot.id] ?? slot.title).trim();
                          updateSlot(slot.id, { title: next });
                          setDraftTitle((prev) => {
                            const copy = { ...prev };
                            delete copy[slot.id];
                            return copy;
                          });
                        }}
                      />
                      <div className="flex items-center gap-1">
                        <TimeInput
                          value={slot.start}
                          ariaLabel="Od"
                          onCommit={(v) => updateSlot(slot.id, { start: v })}
                        />
                        <span className="text-[10px] text-on-surface-variant">–</span>
                        <TimeInput
                          value={slot.end}
                          ariaLabel="Do"
                          onCommit={(v) => updateSlot(slot.id, { end: v })}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <AudienceMenu
                          slot={slot}
                          onChange={(patch) => updateSlot(slot.id, patch)}
                        />
                        <button
                          type="button"
                          onClick={() => removeSlot(slot.id)}
                          className="ml-auto rounded border border-red-500/30 text-red-300 px-1.5 py-0.5 text-[10px]"
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                {dayHints.length > 0 && (
                  <div className="border-t border-white/5 pt-1.5 space-y-1">
                    <p className="text-[9px] uppercase tracking-wide text-on-surface-variant">
                      Zo scrapu
                    </p>
                    {dayHints.slice(0, 4).map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => adoptHint(h)}
                        className="block w-full text-left rounded border border-dashed border-white/15 px-1.5 py-1 text-[10px] text-on-surface-variant hover:border-primary/40 hover:text-primary"
                        title="Pridať do rozvrhu"
                      >
                        {h.start} {h.title.slice(0, 28)}
                        {h.forWomen ? ' · Ž' : ''}
                        {h.forKids ? ' · D' : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SportSelect({
  value,
  onChange,
  preferSports = [],
}: {
  value: string;
  onChange: (next: string) => void;
  preferSports?: string[];
}) {
  const ordered = useMemo(() => {
    const prefer = new Set(
      preferSports.map((s) => s.trim().toUpperCase()).filter(Boolean),
    );
    const known = EVENT_SPORTS as readonly string[];
    const preferred = known.filter((s) => prefer.has(s));
    const rest = known.filter((s) => !prefer.has(s));
    return [...preferred, ...rest] as EventSport[];
  }, [preferSports]);

  const extra =
    value && !(EVENT_SPORTS as readonly string[]).includes(value) ? value : null;

  return (
    <select
      className="rounded border border-white/10 bg-background px-2 py-1 text-[12px] text-on-surface min-w-[10rem]"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">— bez športu —</option>
      {extra && <option value={extra}>{extra}</option>}
      {ordered.map((s) => (
        <option key={s} value={s}>
          {EVENT_SPORT_LABELS[s]} ({s})
        </option>
      ))}
    </select>
  );
}

function AudienceMenu({
  slot,
  onChange,
}: {
  slot: GroupClassSlot;
  onChange: (patch: Partial<GroupClassSlot>) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = [
    slot.forWomen ? 'Ženy' : null,
    slot.forKids ? 'Deti' : null,
    slot.forAdults ? 'Dospelí' : null,
  ].filter(Boolean);
  const label = selected.length ? selected.join(' · ') : 'Typ';

  const options = [
    {
      key: 'forWomen' as const,
      label: 'ženy',
      active: slot.forWomen,
      activeClass: 'text-pink-200',
    },
    {
      key: 'forKids' as const,
      label: 'deti',
      active: slot.forKids,
      activeClass: 'text-sky-200',
    },
    {
      key: 'forAdults' as const,
      label: 'dospelý',
      active: slot.forAdults,
      activeClass: 'text-emerald-200',
    },
  ];

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`rounded border px-1.5 py-0.5 text-[10px] transition-colors ${
          selected.length
            ? 'border-primary/40 bg-primary/10 text-primary'
            : 'border-white/15 text-on-surface-variant'
        }`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {label}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 bottom-full z-20 mb-1 min-w-[6.5rem] rounded-md border border-white/15 bg-surface-container-high py-1 shadow-xl shadow-black/50"
        >
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              role="menuitemcheckbox"
              aria-checked={opt.active}
              onClick={() => onChange({ [opt.key]: !opt.active })}
              className={`flex w-full items-center gap-1.5 px-2 py-1 text-left text-[11px] hover:bg-white/5 ${
                opt.active ? opt.activeClass : 'text-on-surface-variant'
              }`}
            >
              <span
                className={`inline-block w-2.5 h-2.5 rounded-sm border ${
                  opt.active
                    ? 'border-current bg-current/30'
                    : 'border-white/25'
                }`}
              />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TimeInput({
  value,
  onCommit,
  ariaLabel,
}: {
  value: string;
  onCommit: (normalized: string) => void;
  ariaLabel: string;
}) {
  const [local, setLocal] = useState(value);
  const [focused, setFocused] = useState(false);

  if (!focused && local !== value) {
    setLocal(value);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={ariaLabel}
      placeholder="HH:MM"
      className={`w-[3.4rem] rounded border bg-transparent px-1 py-0.5 font-mono text-[11px] text-on-surface ${
        isValidTime(local) ? 'border-white/10' : 'border-red-500/50'
      }`}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        const n = normalizeTime(local);
        if (n) onCommit(n);
        else setLocal(value);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

function suggestEnd(start: string): string {
  const [h, m] = start.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return '19:00';
  const endH = (h! + 1) % 24;
  return `${String(endH).padStart(2, '0')}:${String(m!).padStart(2, '0')}`;
}
