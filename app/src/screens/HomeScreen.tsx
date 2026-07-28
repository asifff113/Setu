import { findAreaByCode, latestStatusEvents, type SetuCategory, type SetuPersonStatus } from '@setu/shared';
import { useEffect, useMemo, useState } from 'react';
import { AreaPicker } from '../components/AreaPicker';
import { BottomSheet } from '../components/BottomSheet';
import { ConnectivityPill } from '../components/ConnectivityPill';
import { useI18n } from '../i18n';
import { getCurrentLocation } from '../lib/geo';
import { timeAgo } from '../lib/time';
import { useAppStore } from '../store/appStore';
import { useEventsStore } from '../store/eventsStore';

const CATEGORIES: SetuCategory[] = ['med', 'rescue', 'food', 'water', 'shelter', 'other'];
const PERSON_STATUSES: SetuPersonStatus[] = ['missing', 'found', 'seen'];

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function HomeScreen() {
  const { t, lang, categoryLabel, categoryIcon, personStatusLabel, statusLabel } = useI18n();
  const identity = useAppStore((s) => s.identity);
  const settings = useAppStore((s) => s.settings);
  const events = useEventsStore((s) => s.events);
  const publish = useEventsStore((s) => s.publish);

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [helpOpen, setHelpOpen] = useState(false);
  const [helpCategory, setHelpCategory] = useState<SetuCategory | null>(null);
  const [helpNote, setHelpNote] = useState('');
  const [attachLoc, setAttachLoc] = useState(false);
  const [locState, setLocState] = useState<'idle' | 'fetching' | 'attached' | 'unavailable'>('idle');

  const [personOpen, setPersonOpen] = useState(false);
  const [personName, setPersonName] = useState('');
  const [personAreaCode, setPersonAreaCode] = useState<string | null>(null);
  const [personStatus, setPersonStatus] = useState<SetuPersonStatus>('missing');
  const [personNote, setPersonNote] = useState('');

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const myStatus = useMemo(() => {
    if (!identity) return undefined;
    return latestStatusEvents(events).find((e) => e.au === identity.author);
  }, [events, identity]);

  function resetHelpForm() {
    setHelpCategory(null);
    setHelpNote('');
    setAttachLoc(false);
    setLocState('idle');
  }

  function resetPersonForm() {
    setPersonName('');
    setPersonAreaCode(settings?.areaCode ?? null);
    setPersonStatus('missing');
    setPersonNote('');
  }

  async function submitSafe() {
    if (!settings || busy) return;
    setBusy(true);
    try {
      await publish({
        t: 'checkin',
        ts: nowSeconds(),
        gh: settings.gh,
        st: 'safe',
        n: settings.name.trim() || undefined,
      });
      setToast(t('submittedSafe'));
    } finally {
      setBusy(false);
    }
  }

  function openHelp() {
    resetHelpForm();
    setHelpOpen(true);
  }

  async function submitHelp() {
    if (!settings || !helpCategory || busy) return;
    setBusy(true);
    try {
      let loc: [number, number] | undefined;
      if (attachLoc) {
        setLocState('fetching');
        const coords = await getCurrentLocation();
        if (coords) {
          loc = coords;
          setLocState('attached');
        } else {
          setLocState('unavailable');
        }
      }
      await publish({
        t: 'help',
        ts: nowSeconds(),
        gh: settings.gh,
        st: 'need',
        cat: helpCategory,
        n: settings.name.trim() || undefined,
        msg: helpNote.trim() ? helpNote.trim().slice(0, 280) : undefined,
        loc,
      });
      setHelpOpen(false);
      setToast(t('submittedHelp'));
    } finally {
      setBusy(false);
    }
  }

  function openPerson() {
    resetPersonForm();
    setPersonOpen(true);
  }

  async function submitPerson() {
    if (!personName.trim() || busy) return;
    setBusy(true);
    try {
      const area = personAreaCode ? findAreaByCode(personAreaCode) : undefined;
      await publish({
        t: 'person',
        ts: nowSeconds(),
        gh: area?.gh ?? '',
        pn: personName.trim().slice(0, 48),
        pst: personStatus,
        msg: personNote.trim() ? personNote.trim().slice(0, 280) : undefined,
      });
      setPersonOpen(false);
      setToast(t('submittedPerson'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 px-5 pt-8 pb-6 text-center">
      <div>
        <h1 className="text-3xl font-bold text-white">{t('appName')}</h1>
        <p className="text-sm text-white/50">{t('appTagline')}</p>
      </div>

      <div className="grid w-full max-w-sm grid-cols-1 gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void submitSafe()}
          className="flex items-center justify-center gap-3 rounded-2xl bg-safe py-6 text-xl font-bold text-white shadow-lg active:opacity-90 disabled:opacity-50"
        >
          <span className="text-2xl" aria-hidden="true">
            ✅
          </span>
          <span>{t('btnSafe')}</span>
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={openHelp}
          className="flex items-center justify-center gap-3 rounded-2xl bg-need py-6 text-xl font-bold text-white shadow-lg active:opacity-90 disabled:opacity-50"
        >
          <span className="text-2xl" aria-hidden="true">
            🆘
          </span>
          <span>{t('btnHelp')}</span>
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={openPerson}
          className="flex items-center justify-center gap-2 rounded-xl bg-surface-2 py-3.5 text-sm font-medium text-white/90 active:opacity-90 disabled:opacity-50"
        >
          <span className="text-lg" aria-hidden="true">
            📋
          </span>
          <span>{t('btnReportPerson')}</span>
        </button>
      </div>

      <div className="w-full max-w-sm rounded-2xl bg-surface p-4 text-left">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/40">
          {t('statusCardTitle')}
        </p>
        {myStatus ? (
          <div className="flex items-center justify-between">
            <div>
              <p
                className={`text-lg font-semibold ${myStatus.st === 'safe' ? 'text-safe' : 'text-need'}`}
              >
                {myStatus.st ? statusLabel(myStatus.st) : ''}
                {myStatus.cat ? ` · ${categoryIcon(myStatus.cat)} ${categoryLabel(myStatus.cat)}` : ''}
              </p>
              {myStatus.msg && <p className="mt-1 text-sm text-white/60">{myStatus.msg}</p>}
            </div>
            <span className="whitespace-nowrap text-xs text-white/40">
              {timeAgo(myStatus.ts, lang)}
            </span>
          </div>
        ) : (
          <p className="text-sm text-white/50">{t('statusNone')}</p>
        )}
      </div>

      <ConnectivityPill />

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-full bg-surface-2 px-4 py-2 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}

      <BottomSheet open={helpOpen} onClose={() => setHelpOpen(false)} title={t('helpSheetTitle')}>
        <div className="flex flex-col gap-4 text-left">
          <div>
            <p className="mb-2 text-sm text-white/60">{t('categoryLabel')}</p>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setHelpCategory(cat)}
                  className={`flex flex-col items-center gap-1 rounded-xl py-3 text-xs font-medium ${
                    helpCategory === cat ? 'bg-accent text-white' : 'bg-surface-2 text-white/70'
                  }`}
                >
                  <span className="text-xl" aria-hidden="true">
                    {categoryIcon(cat)}
                  </span>
                  <span>{categoryLabel(cat)}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/60" htmlFor="help-note">
              {t('noteLabel')}
            </label>
            <textarea
              id="help-note"
              value={helpNote}
              onChange={(e) => setHelpNote(e.target.value)}
              placeholder={t('notePlaceholder')}
              maxLength={280}
              rows={3}
              className="w-full resize-none rounded-xl bg-surface-2 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <label className="flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-3">
            <input
              type="checkbox"
              checked={attachLoc}
              onChange={(e) => setAttachLoc(e.target.checked)}
              className="h-5 w-5 accent-accent"
            />
            <span className="flex-1 text-sm text-white/80">{t('attachLocation')}</span>
          </label>
          {attachLoc && locState !== 'idle' && (
            <p className="-mt-2 text-xs text-white/40">
              {locState === 'fetching' && t('locationFetching')}
              {locState === 'attached' && t('locationAttached')}
              {locState === 'unavailable' && t('locationUnavailable')}
            </p>
          )}

          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setHelpOpen(false)}
              className="flex-1 rounded-xl bg-surface-2 py-3 text-sm font-medium text-white/80"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              disabled={!helpCategory || busy}
              onClick={() => void submitHelp()}
              className="flex-1 rounded-xl bg-accent py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              {t('send')}
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={personOpen} onClose={() => setPersonOpen(false)} title={t('personSheetTitle')}>
        <div className="flex flex-col gap-4 text-left">
          <div>
            <label className="mb-2 block text-sm text-white/60" htmlFor="person-name">
              {t('personNameLabel')}
            </label>
            <input
              id="person-name"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder={t('personNamePlaceholder')}
              maxLength={48}
              className="w-full rounded-xl bg-surface-2 px-4 py-3 text-base text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <p className="mb-2 text-sm text-white/60">{t('personAreaLabel')}</p>
            <AreaPicker value={personAreaCode} onChange={(area) => setPersonAreaCode(area.code)} />
          </div>

          <div>
            <p className="mb-2 text-sm text-white/60">{t('personStatusLabel')}</p>
            <div className="grid grid-cols-3 gap-2">
              {PERSON_STATUSES.map((pst) => (
                <button
                  key={pst}
                  type="button"
                  onClick={() => setPersonStatus(pst)}
                  className={`rounded-xl py-3 text-xs font-medium ${
                    personStatus === pst ? 'bg-accent text-white' : 'bg-surface-2 text-white/70'
                  }`}
                >
                  {personStatusLabel(pst)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/60" htmlFor="person-note">
              {t('personNoteLabel')}
            </label>
            <textarea
              id="person-note"
              value={personNote}
              onChange={(e) => setPersonNote(e.target.value)}
              placeholder={t('notePlaceholder')}
              maxLength={280}
              rows={3}
              className="w-full resize-none rounded-xl bg-surface-2 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setPersonOpen(false)}
              className="flex-1 rounded-xl bg-surface-2 py-3 text-sm font-medium text-white/80"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              disabled={!personName.trim() || busy}
              onClick={() => void submitPerson()}
              className="flex-1 rounded-xl bg-accent py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              {t('send')}
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
