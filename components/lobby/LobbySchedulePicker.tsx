'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import {
  addCalendarDays,
  buildMonthGrid,
  calendarDateKey,
  parseDateKey,
  toDateKey,
} from '@/lib/event-date-filter';

const DATE_STRIP_DAYS = 7;
const TIME_SLOTS = ['17:00', '18:00', '19:00', '20:00', '21:00'] as const;

const timeChip =
  'inline-flex w-full items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] tabular-nums transition-colors active:scale-[0.98]';
const timeChipIdle =
  'border-white/10 text-zinc-400 hover:border-white/16 hover:text-zinc-200';
const timeChipOn = 'border-primary-container/35 bg-primary-container/10 text-white';

const chip =
  'inline-flex shrink-0 items-center justify-center rounded-lg border px-2.5 py-1.5 font-label-caps text-[9px] uppercase tracking-[0.1em] transition-colors active:scale-[0.98]';
const chipIdle =
  'border-white/10 text-zinc-400 hover:border-white/16 hover:text-zinc-200';
const chipOn = 'border-primary-container/35 bg-primary-container/10 text-white';

function dateChipLabel(date: Date, offsetFromToday: number): string {
  const day = date.getDate();
  if (offsetFromToday === 0) return `Dnes ${day}`;
  if (offsetFromToday === 1) return `Zajtra ${day}`;
  const wd = date.toLocaleDateString('sk-SK', { weekday: 'short' }).replace('.', '');
  return `${wd} ${day}`;
}

export function formatLobbyDateLabel(dateKey: string): string {
  if (!dateKey) return '—';
  const parsed = parseDateKey(dateKey);
  if (!parsed) return dateKey;

  const todayKey = toDateKey(new Date());
  const tomorrowKey = addCalendarDays(todayKey, 1);
  if (dateKey === todayKey) return 'Dnes';
  if (dateKey === tomorrowKey) return 'Zajtra';

  return parsed.toLocaleDateString('sk-SK', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function formatLobbyScheduleSummary(date: string, time: string): string {
  if (!date && !time) return '—';
  const datePart = formatLobbyDateLabel(date);
  const timePart = time || '—';
  if (date && time) return `${datePart} · ${timePart}`;
  return date ? datePart : timePart;
}

function buildDateStrip(): Array<{ key: string; date: Date; offset: number }> {
  const todayKey = toDateKey(new Date());
  const rows: Array<{ key: string; date: Date; offset: number }> = [];
  for (let i = 0; i < DATE_STRIP_DAYS; i++) {
    const key = addCalendarDays(todayKey, i);
    if (!key) continue;
    const date = parseDateKey(key);
    if (!date) continue;
    rows.push({ key, date, offset: i });
  }
  return rows;
}

interface LobbySchedulePickerProps {
  date: string;
  time: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
}

export function LobbySchedulePicker({
  date,
  time,
  onDateChange,
  onTimeChange,
}: LobbySchedulePickerProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const stripDates = useMemo(() => buildDateStrip(), []);
  const stripKeys = useMemo(() => new Set(stripDates.map((d) => d.key)), [stripDates]);
  const selectedOutsideStrip = Boolean(date && !stripKeys.has(date));
  const isPresetTime = TIME_SLOTS.includes(time as (typeof TIME_SLOTS)[number]);

  const cursorAnchor = parseDateKey(date) ?? parseDateKey(toDateKey(new Date())) ?? new Date();
  const [cursor, setCursor] = useState({
    year: cursorAnchor.getFullYear(),
    month: cursorAnchor.getMonth(),
  });

  const todayKey = toDateKey(new Date());
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('sk-SK', {
    month: 'long',
    year: 'numeric',
  });
  const grid = buildMonthGrid(cursor.year, cursor.month);

  useEffect(() => {
    if (!date || !stripRef.current) return;
    const el = stripRef.current.querySelector(`[data-date-key="${date}"]`);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [date]);

  function pickDate(key: string) {
    onDateChange(key);
    setCalendarOpen(false);
  }

  function openCustomTime() {
    const input = timeInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') input.showPicker();
    else {
      input.focus();
      input.click();
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5">
        <div
          ref={stripRef}
          className="flex min-w-0 flex-1 gap-1 overflow-x-auto overscroll-x-contain hide-scrollbar touch-pan-x"
          role="list"
          aria-label="Dátum"
        >
          {selectedOutsideStrip ? (
            <button
              type="button"
              role="listitem"
              onClick={() => setCalendarOpen(true)}
              className={`${chip} ${chipOn}`}
            >
              {formatLobbyDateLabel(date)}
            </button>
          ) : null}
          {stripDates.map(({ key, date: day, offset }) => (
            <button
              key={key}
              type="button"
              role="listitem"
              data-date-key={key}
              onClick={() => pickDate(key)}
              className={`${chip} ${date === key ? chipOn : chipIdle}`}
            >
              {dateChipLabel(day, offset)}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label={calendarOpen ? 'Skryť kalendár' : 'Otvoriť kalendár'}
          onClick={() => setCalendarOpen((open) => !open)}
          className={[
            'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors',
            calendarOpen
              ? 'border-primary-container/35 bg-primary-container/10 text-white'
              : 'border-white/10 text-zinc-500 hover:border-white/16 hover:text-zinc-300',
          ].join(' ')}
        >
          <CalendarDays className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>

      {calendarOpen ? (
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-2">
          <div className="mb-1.5 flex items-center justify-between gap-1">
            <button
              type="button"
              aria-label="Predchádzajúci mesiac"
              onClick={() =>
                setCursor((c) => {
                  const m = c.month - 1;
                  return m < 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: m };
                })
              }
              className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-300"
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            <p className="font-label-caps text-[9px] uppercase tracking-[0.1em] text-zinc-400 capitalize">
              {monthLabel}
            </p>
            <button
              type="button"
              aria-label="Ďalší mesiac"
              onClick={() =>
                setCursor((c) => {
                  const m = c.month + 1;
                  return m > 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: m };
                })
              }
              className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-300"
            >
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].map((d) => (
              <span key={d} className="py-0.5 text-[8px] uppercase tracking-wide text-zinc-600">
                {d}
              </span>
            ))}
            {grid.map((day, i) => {
              if (!day) return <span key={`empty-${i}`} className="h-7" />;
              const key = calendarDateKey(day.getFullYear(), day.getMonth(), day.getDate());
              const disabled = key < todayKey;
              const active = key === date;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  onClick={() => pickDate(key)}
                  className={[
                    'flex h-7 items-center justify-center rounded-md text-[11px] transition-colors',
                    disabled
                      ? 'cursor-not-allowed text-zinc-700'
                      : active
                        ? 'bg-primary-container text-white'
                        : 'text-zinc-400 hover:bg-white/[0.05]',
                  ].join(' ')}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-1.5" role="list" aria-label="Čas">
        {TIME_SLOTS.map((slot) => (
          <button
            key={slot}
            type="button"
            role="listitem"
            onClick={() => onTimeChange(slot)}
            className={`${timeChip} ${time === slot ? timeChipOn : timeChipIdle}`}
          >
            {slot}
          </button>
        ))}
        <button
          type="button"
          role="listitem"
          onClick={openCustomTime}
          className={[
            timeChip,
            !isPresetTime ? timeChipOn : timeChipIdle,
            !isPresetTime ? 'font-medium' : '',
          ].join(' ')}
          aria-label={!isPresetTime ? `Vlastný čas ${time}` : 'Vybrať iný čas'}
        >
          {!isPresetTime ? (
            time
          ) : (
            <>
              <Clock className="h-3 w-3 shrink-0 opacity-70" strokeWidth={2} />
              <span className="font-label-caps text-[9px] uppercase tracking-[0.08em]">Iný</span>
            </>
          )}
        </button>
        <input
          ref={timeInputRef}
          type="time"
          value={time}
          step={300}
          onChange={(e) => onTimeChange(e.target.value)}
          className="sr-only"
          tabIndex={-1}
        />
      </div>
    </div>
  );
}
