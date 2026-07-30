import {
  bulletinEvents,
  latestPersonEvents,
  latestStatusEvents,
  offerEvents,
  type SetuEventView,
} from '@setu/shared';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BulletinCard, MissingCard, PersonStatusCard } from '../components/BoardCards';
import { EventDetailSheet } from '../components/EventDetailSheet';
import { CoachMark } from '../components/CoachMark';
import { circleMembers } from '../db/social';
import { useI18n, type DictKey } from '../i18n';
import { areaLabel } from '../lib/area';
import { tryDemo } from '../lib/demoTrigger';
import { distanceKm } from '../lib/geo';
import { useAppStore } from '../store/appStore';
import { useEventsStore } from '../store/eventsStore';
import { useSyncStore } from '../store/syncStore';

type BoardTab = 'people' | 'help' | 'offers' | 'missing' | 'bulletins';
type Sort = 'newest' | 'waiting' | 'nearest';

const TABS: { key: BoardTab; labelKey: DictKey }[] = [
  { key: 'people', labelKey: 'tabPeople' },
  { key: 'help', labelKey: 'tabHelpList' },
  { key: 'offers', labelKey: 'tabOffers' },
  { key: 'missing', labelKey: 'tabMissing' },
  { key: 'bulletins', labelKey: 'tabBulletins' },
];

const EMPTY_KEY: Record<BoardTab, DictKey> = {
  people: 'emptyPeople',
  help: 'emptyHelp',
  offers: 'emptyOffers',
  missing: 'emptyMissing',
  bulletins: 'emptyBulletins',
};

const URGENCY_SCORE = { critical: 3, urgent: 2, normal: 1 } as const;
const CATEGORY_SCORE = { med: 6, rescue: 5, water: 4, shelter: 3, food: 2, other: 1 } as const;

export function BoardScreen({ initialTab }: { initialTab?: BoardTab }) {
  const { t, lang } = useI18n();
  const events = useEventsStore((state) => state.events);
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const resync = useSyncStore((state) => state.resync);
  const [tab, setTab] = useState<BoardTab>(initialTab ?? 'help');
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'all' | 'area' | 'circle'>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [resolvedOpen, setResolvedOpen] = useState(false);
  const [selected, setSelected] = useState<SetuEventView | null>(null);
  const [circleAuthors, setCircleAuthors] = useState<Set<string>>(new Set());
  const [position, setPosition] = useState<[number, number] | null>(null);
  const kiosk = typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('kiosk') === '1';

  useEffect(() => {
    void circleMembers().then((members) => setCircleAuthors(new Set(members.map((member) => member.au))));
  }, []);

  useEffect(() => {
    if (!kiosk) return;
    const cycle: BoardTab[] = ['people', 'help', 'missing'];
    const timer = setInterval(() => {
      setTab((current) => cycle[(cycle.indexOf(current) + 1) % cycle.length] ?? 'people');
    }, 10_000);
    return () => clearInterval(timer);
  }, [kiosk]);

  useEffect(() => {
    if (settings?.responderMode && tab === 'help' && sort !== 'nearest') chooseSort('nearest');
    // `chooseSort` requests location only after the user enabled responder
    // mode in Settings; it does not run for ordinary board visits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.responderMode, tab]);

  useEffect(() => {
    void updateSettings({
      lastSeen: { ...(settings?.lastSeen ?? {}), [tab]: Math.floor(Date.now() / 1000) },
    });
    // tab changes are the intentional persistence boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const statuses = useMemo(() => latestStatusEvents(events), [events]);
  const people = useMemo(() => statuses.filter((event) => event.t === 'checkin'), [statuses]);
  const help = useMemo(
    () => statuses.filter((event) => event.t === 'help' && event.st === 'need'),
    [statuses],
  );
  const offers = useMemo(() => offerEvents(events), [events]);
  const missing = useMemo(() => latestPersonEvents(events), [events]);
  const bulletins = useMemo(() => bulletinEvents(events), [events]);

  const activeList = tab === 'people'
    ? people
    : tab === 'help'
      ? help
      : tab === 'offers'
        ? offers
        : tab === 'missing'
          ? missing
          : bulletins;
  const tabCounts: Record<BoardTab, number> = {
    people: people.length,
    help: help.filter((event) => !event.resolved).length,
    offers: offers.length,
    missing: missing.length,
    bulletins: bulletins.length,
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const muted = new Set(settings?.mutedAuthors ?? []);
    return activeList
      .filter((event) => !muted.has(event.au))
      .filter((event) => scope !== 'area' || !settings?.gh || event.gh.startsWith(settings.gh))
      .filter((event) => scope !== 'circle' || circleAuthors.has(event.au))
      .filter((event) => {
        if (!q) return true;
        return (event.n ?? event.pn ?? '').toLowerCase().includes(q) ||
          areaLabel(event.gh, lang).toLowerCase().includes(q) ||
          (event.msg ?? '').toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (sort === 'nearest' && position) {
          const ad = a.loc ? distanceKm(position, a.loc) : Number.POSITIVE_INFINITY;
          const bd = b.loc ? distanceKm(position, b.loc) : Number.POSITIVE_INFINITY;
          if (ad !== bd) return ad - bd;
        }
        if (sort === 'waiting') return a.ts - b.ts;
        const urgency = (URGENCY_SCORE[b.urg ?? 'normal'] - URGENCY_SCORE[a.urg ?? 'normal']) ||
          (CATEGORY_SCORE[b.cat ?? 'other'] - CATEGORY_SCORE[a.cat ?? 'other']);
        return urgency || b.ts - a.ts;
      });
  }, [activeList, circleAuthors, lang, position, query, scope, settings, sort]);

  const active = tab === 'help' ? filtered.filter((event) => !event.resolved) : filtered;
  const resolved = tab === 'help' ? filtered.filter((event) => event.resolved) : [];

  function chooseSort(value: Sort): void {
    setSort(value);
    if (value === 'nearest' && !position) {
      navigator.geolocation?.getCurrentPosition(
        ({ coords }) => setPosition([coords.latitude, coords.longitude]),
        () => setSort('newest'),
        { enableHighAccuracy: false, timeout: 8000 },
      );
    }
  }

  if (kiosk) {
    return (
      <div className="min-h-full bg-bg px-8 py-7">
        <header className="mb-6 flex items-center justify-between border-b-4 border-accent pb-4">
          <div>
            <h1 className="text-4xl font-bold text-ink">{t('appName')} · {t(TABS.find((item) => item.key === tab)?.labelKey ?? 'tabPeople')}</h1>
            <p className="mt-1 text-lg text-muted">{t('kioskHint')}</p>
          </div>
          <p className="text-3xl font-bold text-accent">{active.length}</p>
        </header>
        <div className="grid grid-cols-2 gap-5">
          {active.slice(0, 10).map((event) => (
            <div key={event.id} className="text-lg">
              <BoardCard tab={tab} event={event} onOpen={() => undefined} />
            </div>
          ))}
        </div>
        {active.length === 0 && <p className="py-24 text-center text-2xl text-muted">{t(EMPTY_KEY[tab])}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">{t('requestsTitle')}</h1>
          <p className="text-xs text-muted">{t('requestsHint')}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" aria-label={t('refresh')} onClick={resync} className="rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold text-accent">↻</button>
          <Link to="/map" className="rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold text-accent">
            🗺 {t('mapTitle')}
          </Link>
        </div>
      </div>
      <CoachMark id="requests">{t('coachRequests')}</CoachMark>

      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-line bg-surface p-1 shadow-sm">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold ${
              tab === item.key ? 'bg-accent text-white' : 'text-muted'
            }`}
          >
            {t(item.labelKey)}
            <span className={`rounded-full px-2 py-0.5 text-xs ${tab === item.key ? 'bg-white/20' : 'bg-surface-2'}`}>
              {tabCounts[item.key]}
            </span>
          </button>
        ))}
      </div>

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('searchPlaceholder')}
        className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-accent"
      />

      <div className="flex gap-2 overflow-x-auto">
        {(['all', 'area', 'circle'] as const).map((value) => (
          <button
            key={value}
            type="button"
            disabled={(value === 'area' && !settings?.gh) || (value === 'circle' && circleAuthors.size === 0)}
            onClick={() => setScope(value)}
            className={`min-h-10 whitespace-nowrap rounded-xl border px-3 text-xs font-semibold disabled:opacity-40 ${
              scope === value ? 'border-accent bg-accent text-white' : 'border-line bg-surface text-muted'
            }`}
          >
            {value === 'all' ? t('filterAll') : value === 'area' ? t('filterMyArea') : t('filterCircle')}
          </button>
        ))}
        <select
          aria-label={t('sortLabel')}
          value={sort}
          onChange={(event) => chooseSort(event.target.value as Sort)}
          className="ml-auto min-h-10 rounded-xl border border-line bg-surface px-2 text-xs font-semibold text-muted"
        >
          <option value="newest">{t('sortNewest')}</option>
          <option value="waiting">{t('sortWaiting')}</option>
          <option value="nearest">{t('sortNearest')}</option>
        </select>
      </div>

      <div className="flex flex-col gap-3 pb-6">
        {active.length === 0 && resolved.length === 0 && (
          <div className="rounded-2xl border border-line bg-surface px-5 py-8 text-center shadow-sm">
            <div className="text-4xl" aria-hidden="true">🤝</div>
            <p className="mt-3 text-sm font-semibold text-ink">
              {query.trim() ? t('noSearchResults') : t(EMPTY_KEY[tab])}
            </p>
            {!query.trim() && (
              <div className="mt-4 flex justify-center gap-2">
                <Link to="/share" className="rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-white">
                  {t('shareSetu')}
                </Link>
                <button type="button" onClick={() => void tryDemo()} className="rounded-xl bg-surface-2 px-3 py-2 text-xs font-semibold text-accent">
                  {t('tryDemo')}
                </button>
              </div>
            )}
          </div>
        )}
        {active.map((event) => (
          <BoardCard key={event.id} tab={tab} event={event} onOpen={() => setSelected(event)} />
        ))}
        {resolved.length > 0 && (
          <section>
            <button
              type="button"
              onClick={() => setResolvedOpen((open) => !open)}
              className="flex min-h-11 w-full items-center justify-between rounded-xl bg-safe/10 px-4 text-sm font-semibold text-safe"
            >
              <span>✓ {t('resolvedSection')} ({resolved.length})</span>
              <span aria-hidden="true">{resolvedOpen ? '⌃' : '⌄'}</span>
            </button>
            {resolvedOpen && (
              <div className="mt-3 flex flex-col gap-3">
                {resolved.map((event) => (
                  <PersonStatusCard key={event.id} event={event} onOpen={() => setSelected(event)} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {selected && (
        <EventDetailSheet event={selected} open onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function BoardCard({
  tab,
  event,
  onOpen,
}: {
  tab: BoardTab;
  event: SetuEventView;
  onOpen: () => void;
}) {
  if (tab === 'missing') return <MissingCard event={event} onOpen={onOpen} />;
  if (tab === 'bulletins') return <BulletinCard event={event} onOpen={onOpen} />;
  return <PersonStatusCard event={event} onOpen={onOpen} />;
}
