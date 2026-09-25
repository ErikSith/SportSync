'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocale } from '@/components/i18n/LocaleProvider';
import {
  isEventSport,
  sportDisplayLabel,
  suggestSportsForQuery,
  type EventSport,
} from '@/lib/constants/sports';

interface SportTypeaheadProps {
  id?: string;
  value: string;
  onChange: (sport: EventSport) => void;
  className?: string;
  placeholder?: string;
}

export function SportTypeahead({
  id,
  value,
  onChange,
  className = '',
  placeholder,
}: SportTypeaheadProps) {
  const { locale, t } = useLocale();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = isEventSport(value)
    ? sportDisplayLabel(value, locale)
    : '';

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(selectedLabel);
  const [highlight, setHighlight] = useState(0);
  const editing = open;

  useEffect(() => {
    if (!editing) setQuery(selectedLabel);
  }, [editing, selectedLabel]);

  const suggestions = useMemo(
    () => suggestSportsForQuery(editing ? query : '', locale, 8),
    [editing, locale, query],
  );

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      setOpen(false);
      setQuery(selectedLabel);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open, selectedLabel]);

  const selectSport = (sport: EventSport) => {
    onChange(sport);
    setQuery(sportDisplayLabel(sport, locale));
    setOpen(false);
    inputRef.current?.blur();
  };

  const showList = open && suggestions.length > 0;
  const noMatch =
    open && query.trim().length > 0 && suggestions.length === 0;

  return (
    <div ref={rootRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          showList ? `${listId}-opt-${highlight}` : undefined
        }
        autoComplete="off"
        spellCheck={false}
        value={query}
        placeholder={placeholder ?? t('manage.form.sportType')}
        onFocus={() => {
          setOpen(true);
          setQuery('');
        }}
        onBlur={() => {
          window.setTimeout(() => {
            if (rootRef.current?.contains(document.activeElement)) return;
            setOpen(false);
            setQuery(
              isEventSport(value) ? sportDisplayLabel(value, locale) : '',
            );
          }, 0);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
            setQuery(selectedLabel);
            inputRef.current?.blur();
            return;
          }
          if (!showList) {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
            }
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlight((i) => Math.min(i + 1, suggestions.length - 1));
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight((i) => Math.max(i - 1, 0));
            return;
          }
          if (e.key === 'Enter') {
            const pick = suggestions[highlight];
            if (!pick) return;
            e.preventDefault();
            selectSport(pick);
          }
        }}
        className={className}
      />

      {showList ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={t('manage.form.sportType')}
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-outline-variant/40 bg-surface-container-high py-1 shadow-lg"
        >
          {suggestions.map((sport, index) => {
            const active = index === highlight;
            const selected = sport === value;
            return (
              <li key={sport} role="presentation">
                <button
                  id={`${listId}-opt-${index}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setHighlight(index)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectSport(sport)}
                  className={[
                    'flex w-full items-center justify-between gap-2 px-3 py-2 text-left font-body-md text-sm transition-colors',
                    active
                      ? 'bg-white/[0.08] text-on-surface'
                      : 'text-on-surface-variant hover:bg-white/[0.04] hover:text-on-surface',
                  ].join(' ')}
                >
                  <span className="truncate">{sportDisplayLabel(sport, locale)}</span>
                  {selected ? (
                    <span className="shrink-0 font-label-caps text-[9px] uppercase tracking-wider text-secondary">
                      ✓
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {noMatch ? (
        <p className="mt-1.5 font-body-md text-xs text-on-surface-variant">
          {t('manage.form.sportNoMatch')}
        </p>
      ) : null}
    </div>
  );
}
