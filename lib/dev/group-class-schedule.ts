/** Weekly repeating group-class slots (admin Reviewer calendar). */

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7; // ISO: Mon=1 … Sun=7

/** Hall / room / sport partition inside one venue. */
export type GroupClassArea = {
  id: string;
  /** e.g. "Hala A", "Yoga studio", "Tenis" */
  name: string;
  /** Optional sport tag (TENNIS, YOGA, …). */
  sport: string;
};

export type GroupClassSlot = {
  id: string;
  weekday: Weekday;
  /** Wall-clock "HH:MM" */
  start: string;
  /** Wall-clock "HH:MM" */
  end: string;
  title: string;
  forKids: boolean;
  forWomen: boolean;
  forAdults: boolean;
  /** Area / hall this slot belongs to (null = unassigned). */
  areaId: string | null;
};

export type GroupClassSchedule = {
  areas: GroupClassArea[];
  slots: GroupClassSlot[];
};

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  1: 'Po',
  2: 'Ut',
  3: 'St',
  4: 'Št',
  5: 'Pi',
  6: 'So',
  7: 'Ne',
};

export const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 7];

export const UNASSIGNED_AREA_ID = '__unassigned__';

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(value: string): boolean {
  return TIME_RE.test(value.trim());
}

export function normalizeTime(value: string): string | null {
  const m = value.trim().match(TIME_RE);
  if (!m) return null;
  return `${m[1]!.padStart(2, '0')}:${m[2]}`;
}

export function newSlotId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `slot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function newAreaId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `area-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyArea(name = 'Hala 1', sport = ''): GroupClassArea {
  return {
    id: newAreaId(),
    name: name.trim() || 'Hala',
    sport: sport.trim(),
  };
}

export function emptySlot(
  weekday: Weekday,
  areaId: string | null = null,
): GroupClassSlot {
  return {
    id: newSlotId(),
    weekday,
    start: '18:00',
    end: '19:00',
    title: '',
    forKids: false,
    forWomen: false,
    forAdults: false,
    areaId,
  };
}

function parseArea(raw: unknown): GroupClassArea | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' && r.id ? r.id : newAreaId();
  const name = typeof r.name === 'string' ? r.name.trim() : '';
  if (!name) return null;
  return {
    id,
    name,
    sport: typeof r.sport === 'string' ? r.sport.trim() : '',
  };
}

function parseSlot(raw: unknown): GroupClassSlot | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const weekdayNum = Number(r.weekday);
  if (!Number.isInteger(weekdayNum) || weekdayNum < 1 || weekdayNum > 7) return null;
  const start = typeof r.start === 'string' ? normalizeTime(r.start) : null;
  const end = typeof r.end === 'string' ? normalizeTime(r.end) : null;
  if (!start || !end) return null;
  const areaIdRaw = r.areaId;
  const areaId =
    typeof areaIdRaw === 'string' && areaIdRaw.trim()
      ? areaIdRaw.trim()
      : null;
  return {
    id: typeof r.id === 'string' && r.id ? r.id : newSlotId(),
    weekday: weekdayNum as Weekday,
    start,
    end,
    title: typeof r.title === 'string' ? r.title.trim() : '',
    forKids: Boolean(r.forKids),
    forWomen: Boolean(r.forWomen),
    forAdults: Boolean(r.forAdults),
    areaId,
  };
}

export function parseGroupClassSchedule(raw: unknown): GroupClassSchedule {
  if (!raw || typeof raw !== 'object') return { areas: [], slots: [] };

  const areasRaw = (raw as { areas?: unknown }).areas;
  const areas: GroupClassArea[] = [];
  if (Array.isArray(areasRaw)) {
    for (const row of areasRaw) {
      const a = parseArea(row);
      if (a) areas.push(a);
    }
  }

  const slotsRaw = (raw as { slots?: unknown }).slots;
  const slots: GroupClassSlot[] = [];
  if (Array.isArray(slotsRaw)) {
    for (const row of slotsRaw) {
      const s = parseSlot(row);
      if (s) slots.push(s);
    }
  }

  // Legacy: slots without areas → keep areaId null; UI shows as "Bez hály".
  // If AI/area names referenced but areas missing, invent areas from slot areaIds.
  const known = new Set(areas.map((a) => a.id));
  for (const s of slots) {
    if (s.areaId && !known.has(s.areaId)) {
      areas.push({ id: s.areaId, name: 'Hala', sport: '' });
      known.add(s.areaId);
    }
  }

  return {
    areas,
    slots: slots.sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start)),
  };
}

/** Merge schedule into amenities JSON without clobbering boolean flags. */
export function mergeAmenitiesWithSchedule(
  amenities: unknown,
  schedule: GroupClassSchedule,
): Record<string, unknown> {
  const base =
    amenities && typeof amenities === 'object' && !Array.isArray(amenities)
      ? { ...(amenities as Record<string, unknown>) }
      : {};
  if (schedule.slots.length === 0 && schedule.areas.length === 0) {
    delete base.groupClassSchedule;
  } else {
    base.groupClassSchedule = {
      areas: schedule.areas.map((a) => ({
        id: a.id,
        name: a.name,
        sport: a.sport,
      })),
      slots: schedule.slots.map((s) => ({
        id: s.id,
        weekday: s.weekday,
        start: s.start,
        end: s.end,
        title: s.title,
        forKids: s.forKids,
        forWomen: s.forWomen,
        forAdults: s.forAdults,
        areaId: s.areaId,
      })),
    };
  }
  return base;
}

export function extractScheduleFromAmenities(amenities: unknown): GroupClassSchedule {
  if (!amenities || typeof amenities !== 'object' || Array.isArray(amenities)) {
    return { areas: [], slots: [] };
  }
  return parseGroupClassSchedule(
    (amenities as Record<string, unknown>).groupClassSchedule,
  );
}

/** JS Date.getDay(): Sun=0 … Sat=6 → ISO Mon=1 … Sun=7 */
export function jsDayToIsoWeekday(jsDay: number): Weekday {
  return (jsDay === 0 ? 7 : jsDay) as Weekday;
}

export function areaLabel(area: GroupClassArea | null | undefined): string {
  if (!area) return 'Bez hály';
  return area.sport ? `${area.name} · ${area.sport}` : area.name;
}
