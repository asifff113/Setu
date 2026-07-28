import { useMemo, useState } from 'react';
import { AREAS, searchAreas, type Area } from '@setu/shared';
import { useI18n } from '../i18n';

interface AreaPickerProps {
  value: string | null;
  onChange: (area: Area) => void;
  placeholder?: string;
}

/** Searchable bn/en district+thana picker backed by shared/areas.ts. */
export function AreaPicker({ value, onChange, placeholder }: AreaPickerProps) {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchAreas(query).slice(0, 40), [query]);
  const selected = AREAS.find((a) => a.code === value);

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder ?? t('onboardAreaSearchPlaceholder')}
        className="w-full rounded-xl bg-surface-2 px-4 py-3 text-base text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-accent"
      />
      {!query && (
        <div className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-white/70">
          {selected ? (lang === 'bn' ? selected.bn : selected.name) : t('onboardAreaNone')}
        </div>
      )}
      {query && (
        <div className="max-h-56 overflow-y-auto rounded-xl bg-surface-2">
          {results.length === 0 && (
            <div className="px-4 py-3 text-sm text-white/40">{t('noSearchResults')}</div>
          )}
          {results.map((area) => (
            <button
              key={area.code}
              type="button"
              onClick={() => {
                onChange(area);
                setQuery('');
              }}
              className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-white/5 ${
                area.code === value ? 'text-accent' : 'text-white'
              }`}
            >
              <span>{lang === 'bn' ? area.bn : area.name}</span>
              <span className="text-xs text-white/40">{lang === 'bn' ? area.name : area.bn}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
