import { useEffect, useId, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { AREAS, findAreaByCode, searchAreas, type Area } from '@setu/shared';
import { useI18n } from '../i18n';

interface AreaPickerProps {
  value: string | null;
  /** `null` when the user clears the current pick. */
  onChange: (area: Area | null) => void;
  placeholder?: string;
}

/**
 * Exact match, then prefix, then anything else — `searchAreas` returns table
 * order, which buried "Dhaka" under Chandpur and Dhanmondi when you typed "dha".
 */
function rankAreas(query: string): Area[] {
  const raw = query.trim();
  if (!raw) return AREAS;
  const q = raw.toLowerCase();
  const score = (area: Area): number => {
    const name = area.name.toLowerCase();
    if (name === q || area.code === q || area.bn === raw) return 0;
    if (name.startsWith(q) || area.code.startsWith(q) || area.bn.startsWith(raw)) return 1;
    return 2;
  };
  return searchAreas(raw)
    .map((area, index) => ({ area, index, score: score(area) }))
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((entry) => entry.area);
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </svg>
  );
}

/** Searchable bn/en district+thana picker backed by shared/areas.ts. */
export function AreaPicker({ value, onChange, placeholder }: AreaPickerProps) {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const results = useMemo(() => rankAreas(query), [query]);
  const selected = value ? findAreaByCode(value) : undefined;
  const primary = (area: Area) => (lang === 'bn' ? area.bn : area.name);
  const secondary = (area: Area) => (lang === 'bn' ? area.name : area.bn);

  // Arrow-key navigation is useless if the highlighted row is off-screen.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  /** Focusing the field browses the whole list — no need to guess a name first. */
  function openList() {
    setOpen(true);
    const index = results.findIndex((area) => area.code === value);
    setActive(index < 0 ? 0 : index);
  }

  function commit(area: Area) {
    onChange(area);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur(); // drops the mobile keyboard once the pick is made
  }

  /** Only close once focus has actually left the picker (input ⇄ option). */
  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        openList();
        return;
      }
      if (!results.length) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((index) => (index + step + results.length) % results.length);
      return;
    }
    if (event.key === 'Enter' && open && results[active]) {
      event.preventDefault();
      commit(results[active]);
      return;
    }
    if (event.key === 'Escape' && (open || query)) {
      // Swallowed so the surrounding BottomSheet doesn't close along with it.
      event.stopPropagation();
      setQuery('');
      setOpen(false);
    }
  }

  return (
    <div className="flex flex-col gap-2" onBlur={handleBlur}>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
          <SearchIcon />
        </span>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${listId}-${results[active].code}` : undefined}
          aria-label={t('onboardAreaLabel')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={openList}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? t('onboardAreaSearchPlaceholder')}
          // Phone keyboards autocorrect Bangladeshi place names into nonsense.
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          inputMode="search"
          enterKeyHint="done"
          className="w-full rounded-xl border border-line bg-surface py-3 pl-10 pr-11 text-base text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
        {query && (
          <button
            type="button"
            aria-label={t('areaClearSearch')}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setQuery('');
              setActive(0);
              inputRef.current?.focus();
            }}
            className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-lg text-muted"
          >
            ✕
          </button>
        )}
      </div>

      {/* The current pick stays put while you search — hiding it behind the
          results made the field jump and lost track of what was already set. */}
      <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-4 py-2.5">
        <span className={`min-w-0 flex-1 truncate text-sm ${selected ? 'font-semibold text-ink' : 'text-muted'}`}>
          {selected ? primary(selected) : t('onboardAreaNone')}
        </span>
        {selected && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChange(null)}
            className="min-h-9 shrink-0 rounded-lg px-2 text-xs font-semibold text-muted"
          >
            {t('areaClear')}
          </button>
        )}
      </div>

      {open && (
        <div
          id={listId}
          ref={listRef}
          role="listbox"
          aria-label={t('onboardAreaLabel')}
          className="max-h-64 overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface shadow-sm"
        >
          {results.length === 0 && <p className="px-4 py-3 text-sm text-muted">{t('noSearchResults')}</p>}
          {results.map((area, index) => {
            const isSelected = area.code === value;
            return (
              <button
                key={area.code}
                id={`${listId}-${area.code}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-active={index === active}
                // Keeps focus in the input, so the tap lands as a click instead
                // of blurring the field and closing the list out from under it.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(area)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm ${
                  index === active ? 'bg-surface-2' : ''
                } ${isSelected ? 'text-accent' : 'text-ink'}`}
              >
                <span className="min-w-0 flex-1 truncate font-medium">{primary(area)}</span>
                <span className="shrink-0 text-xs text-muted">{secondary(area)}</span>
                {isSelected && (
                  <span aria-hidden="true" className="shrink-0 text-accent">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
