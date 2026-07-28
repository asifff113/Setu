import { bulletinEvents, latestPersonEvents, latestStatusEvents, type SetuEvent } from '@setu/shared';
import { useMemo, useState } from 'react';
import { BulletinCard, MissingCard, PersonStatusCard } from '../components/BoardCards';
import { useI18n, type DictKey } from '../i18n';
import { areaLabel } from '../lib/area';
import { useAppStore } from '../store/appStore';
import { useEventsStore } from '../store/eventsStore';

type BoardTab = 'people' | 'help' | 'missing' | 'bulletins';

const TABS: { key: BoardTab; labelKey: DictKey }[] = [
  { key: 'people', labelKey: 'tabPeople' },
  { key: 'help', labelKey: 'tabHelpList' },
  { key: 'missing', labelKey: 'tabMissing' },
  { key: 'bulletins', labelKey: 'tabBulletins' },
];

const EMPTY_KEY: Record<BoardTab, DictKey> = {
  people: 'emptyPeople',
  help: 'emptyHelp',
  missing: 'emptyMissing',
  bulletins: 'emptyBulletins',
};

export function BoardScreen() {
  const { t, lang } = useI18n();
  const events = useEventsStore((s) => s.events);
  const settings = useAppStore((s) => s.settings);

  const [tab, setTab] = useState<BoardTab>('people');
  const [query, setQuery] = useState('');
  const [myAreaOnly, setMyAreaOnly] = useState(false);

  const people = useMemo(() => latestStatusEvents(events), [events]);
  const help = useMemo(() => people.filter((e) => e.st === 'need'), [people]);
  const missing = useMemo(() => latestPersonEvents(events), [events]);
  const bulletins = useMemo(() => bulletinEvents(events), [events]);

  const activeList =
    tab === 'people' ? people : tab === 'help' ? help : tab === 'missing' ? missing : bulletins;

  const areaFiltered = useMemo(() => {
    if (!myAreaOnly || !settings?.gh) return activeList;
    return activeList.filter((e) => e.gh === settings.gh);
  }, [activeList, myAreaOnly, settings?.gh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return areaFiltered;
    return areaFiltered.filter((e) => {
      const name = (e.n ?? e.pn ?? '').toLowerCase();
      const area = areaLabel(e.gh, lang).toLowerCase();
      const msg = (e.msg ?? '').toLowerCase();
      return name.includes(q) || area.includes(q) || msg.includes(q);
    });
  }, [areaFiltered, query, lang]);

  return (
    <div className="flex flex-col gap-4 px-4 pt-4">
      <h1 className="text-xl font-bold text-white">{t('boardTitle')}</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            type="button"
            onClick={() => setTab(tb.key)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${
              tab === tb.key ? 'bg-accent text-white' : 'bg-surface-2 text-white/70'
            }`}
          >
            {t(tb.labelKey)}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('searchPlaceholder')}
        className="w-full rounded-xl bg-surface-2 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-accent"
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMyAreaOnly(false)}
          className={`flex-1 rounded-xl py-2 text-sm font-medium ${
            !myAreaOnly ? 'bg-accent text-white' : 'bg-surface-2 text-white/70'
          }`}
        >
          {t('filterAll')}
        </button>
        <button
          type="button"
          onClick={() => setMyAreaOnly(true)}
          disabled={!settings?.gh}
          className={`flex-1 rounded-xl py-2 text-sm font-medium disabled:opacity-40 ${
            myAreaOnly ? 'bg-accent text-white' : 'bg-surface-2 text-white/70'
          }`}
        >
          {t('filterMyArea')}
        </button>
      </div>

      <div className="flex flex-col gap-3 pb-6">
        {filtered.length === 0 && (
          <p className="pt-6 text-center text-sm text-white/40">
            {query.trim() ? t('noSearchResults') : t(EMPTY_KEY[tab])}
          </p>
        )}
        {filtered.map((event) => (
          <BoardCard key={event.id} tab={tab} event={event} />
        ))}
      </div>
    </div>
  );
}

function BoardCard({ tab, event }: { tab: BoardTab; event: SetuEvent }) {
  if (tab === 'missing') return <MissingCard event={event} />;
  if (tab === 'bulletins') return <BulletinCard event={event} />;
  return <PersonStatusCard event={event} />;
}
