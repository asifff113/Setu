import {
  findAreaByCode,
  latestStatusEvents,
  type SetuAttachment,
  type SetuCategory,
  type SetuPersonStatus,
  type SetuUrgency,
} from '@setu/shared';
import { useEffect, useMemo, useRef, useState, type SVGProps } from 'react';
import { Link } from 'react-router-dom';
import { AreaPicker } from '../components/AreaPicker';
import { BottomSheet } from '../components/BottomSheet';
import { ConnectivityPill } from '../components/ConnectivityPill';
import { AttachmentComposer } from '../components/AttachmentComposer';
import { useI18n } from '../i18n';
import { getCurrentLocation } from '../lib/geo';
import { timeAgo } from '../lib/time';
import { useAppStore } from '../store/appStore';
import { useEventsStore } from '../store/eventsStore';
import { circleMembers } from '../db/social';
import type { CircleRow } from '../db/schema';

const CATEGORIES: SetuCategory[] = ['med', 'rescue', 'food', 'water', 'shelter', 'other'];
const PERSON_STATUSES: SetuPersonStatus[] = ['missing', 'found', 'seen'];

function SafeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" {...props}>
      <path d="m5 12 4 4 10-10" />
    </svg>
  );
}

function HelpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function PersonSearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="10" cy="8" r="4" />
      <path d="M3 21a7 7 0 0 1 10.5-6.1" />
      <circle cx="17" cy="17" r="3" />
      <path d="m19.5 19.5 2 2" />
    </svg>
  );
}

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
  const [helpKind, setHelpKind] = useState<'need' | 'offer'>('need');
  const [helpUrgency, setHelpUrgency] = useState<SetuUrgency>('normal');
  const [helpNote, setHelpNote] = useState('');
  const [helpAttachment, setHelpAttachment] = useState<SetuAttachment>();
  const [attachLoc, setAttachLoc] = useState(false);
  const [locState, setLocState] = useState<'idle' | 'fetching' | 'attached' | 'unavailable'>('idle');

  const [personOpen, setPersonOpen] = useState(false);
  const [personName, setPersonName] = useState('');
  const [personAreaCode, setPersonAreaCode] = useState<string | null>(null);
  const [personStatus, setPersonStatus] = useState<SetuPersonStatus>('missing');
  const [personNote, setPersonNote] = useState('');
  const [personAttachment, setPersonAttachment] = useState<SetuAttachment>();
  const [circle, setCircle] = useState<CircleRow[]>([]);
  const shortcutHandled = useRef(false);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    void circleMembers().then(setCircle);
  }, []);

  const myStatus = useMemo(() => {
    if (!identity) return undefined;
    return latestStatusEvents(events).find((e) => e.au === identity.author);
  }, [events, identity]);

  function resetHelpForm() {
    setHelpCategory(null);
    setHelpNote('');
    setHelpUrgency('normal');
    setHelpAttachment(undefined);
    setAttachLoc(false);
    setLocState('idle');
  }

  function resetPersonForm() {
    setPersonName('');
    setPersonAreaCode(settings?.areaCode ?? null);
    setPersonStatus('missing');
    setPersonNote('');
    setPersonAttachment(undefined);
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
      navigator.vibrate?.([30, 30, 30]);
      if ('Notification' in window && Notification.permission === 'default') {
        void Notification.requestPermission();
      }
      setToast(t('submittedSafe'));
    } catch {
      setToast(t('errorGeneric'));
    } finally {
      setBusy(false);
    }
  }

  function openHelp(kind: 'need' | 'offer' = 'need') {
    resetHelpForm();
    setHelpKind(kind);
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
        st: helpKind,
        cat: helpCategory,
        n: settings.name.trim() || undefined,
        msg: helpNote.trim() ? helpNote.trim().slice(0, 280) : undefined,
        loc,
        urg: helpKind === 'need' ? helpUrgency : undefined,
        att: helpAttachment,
      });
      navigator.vibrate?.(80);
      setHelpOpen(false);
      setToast(t('submittedHelp'));
    } catch {
      setToast(t('errorGeneric'));
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
        att: personAttachment,
      });
      setPersonOpen(false);
      setToast(t('submittedPerson'));
    } catch {
      setToast(t('errorGeneric'));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (shortcutHandled.current || !settings) return;
    const url = new URL(window.location.href);
    const action = url.searchParams.get('action');
    if (!action) return;
    shortcutHandled.current = true;
    url.searchParams.delete('action');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    if (action === 'safe') void submitSafe();
    if (action === 'help') openHelp('need');
    // Shortcut action is intentionally handled once after settings hydrate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const statusBorder =
    myStatus?.st === 'safe'
      ? 'border-l-4 border-l-safe'
      : myStatus?.st === 'need'
        ? 'border-l-4 border-l-need'
        : '';

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pt-5 pb-6">
      <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              {t('appTagline')}
            </p>
            <h1 className="mt-1 text-3xl font-bold text-ink">{t('appName')}</h1>
          </div>
          <ConnectivityPill />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted">{t('onboardSubtitle')}</p>
      </section>

      {circle.length > 0 && (
        <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">{t('circleTitle')}</h2>
            <Link to="/circle" className="text-xs font-semibold text-accent">{t('circleManage')}</Link>
          </div>
          <div className="mt-3 flex gap-3 overflow-x-auto">
            {circle.map((member) => {
              const status = latestStatusEvents(events).find((event) => event.au === member.au);
              return (
                <div key={member.au} className="w-20 shrink-0 text-center">
                  <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full font-bold ${
                    status?.st === 'safe' ? 'bg-safe/15 text-safe' : status?.st === 'need' ? 'bg-need/15 text-need' : 'bg-surface-2 text-muted'
                  }`}>
                    {status?.st === 'safe' ? '✓' : status?.st === 'need' ? '!' : '?'}
                  </span>
                  <p className="mt-1 truncate text-xs font-semibold text-ink">{member.name}</p>
                  <p className="truncate text-[10px] text-muted">{status ? timeAgo(status.ts, lang) : t('circleNoStatus')}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void submitSafe()}
          className="flex min-h-[112px] items-center justify-center gap-4 rounded-2xl bg-safe px-5 py-6 text-xl font-bold text-white shadow-lg shadow-safe/20 active:opacity-90 disabled:opacity-50"
        >
          <SafeIcon className="h-8 w-8" aria-hidden="true" />
          <span>{t('btnSafe')}</span>
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => openHelp('need')}
          className="flex min-h-[112px] items-center justify-center gap-4 rounded-2xl bg-need px-5 py-6 text-xl font-bold text-white shadow-lg shadow-need/20 active:opacity-90 disabled:opacity-50"
        >
          <HelpIcon className="h-8 w-8" aria-hidden="true" />
          <span>{t('btnHelp')}</span>
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => openHelp('offer')}
          className="flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-safe/30 bg-safe/10 px-4 py-3.5 text-sm font-semibold text-safe shadow-sm active:opacity-90 disabled:opacity-50"
        >
          <span aria-hidden="true">🤝</span>
          <span>{t('btnOffer')}</span>
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={openPerson}
          className="flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 text-sm font-semibold text-ink shadow-sm active:opacity-90 disabled:opacity-50"
        >
          <PersonSearchIcon className="h-5 w-5 text-accent" aria-hidden="true" />
          <span>{t('btnReportPerson')}</span>
        </button>
      </div>

      {!myStatus && (
        <div className="rounded-2xl border border-safe/30 bg-safe/10 px-4 py-3 text-sm leading-relaxed text-safe">
          {t('homeSafeNudge')}
        </div>
      )}

      <section className={`rounded-2xl border border-line bg-surface p-4 shadow-sm ${statusBorder}`}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          {t('statusCardTitle')}
        </p>
        {myStatus ? (
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                className={`text-lg font-semibold ${myStatus.st === 'safe' ? 'text-safe' : 'text-need'}`}
              >
                {myStatus.st ? statusLabel(myStatus.st) : ''}
                {myStatus.cat ? ` - ${categoryIcon(myStatus.cat)} ${categoryLabel(myStatus.cat)}` : ''}
              </p>
              {myStatus.msg && <p className="mt-1 text-sm leading-relaxed text-ink/75">{myStatus.msg}</p>}
            </div>
            <span className="whitespace-nowrap text-xs text-muted">
              {timeAgo(myStatus.ts, lang)}
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted">{t('statusNone')}</p>
        )}
      </section>

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink shadow-xl">
          {toast}
        </div>
      )}

      <BottomSheet
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={helpKind === 'offer' ? t('offerSheetTitle') : t('helpSheetTitle')}
      >
        <div className="flex flex-col gap-4 text-left">
          <div>
            <p className="mb-2 text-sm font-medium text-muted">{t('categoryLabel')}</p>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setHelpCategory(cat)}
                  className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-xs font-semibold ${
                    helpCategory === cat
                      ? 'border-accent bg-accent text-white'
                      : 'border-line bg-surface-2 text-muted'
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

          {helpKind === 'need' && (
            <div>
              <p className="mb-2 text-sm font-medium text-muted">{t('urgencyLabel')}</p>
              <div className="grid grid-cols-3 gap-2">
                {(['normal', 'urgent', 'critical'] as SetuUrgency[]).map((urgency) => (
                  <button
                    key={urgency}
                    type="button"
                    onClick={() => setHelpUrgency(urgency)}
                    className={`min-h-11 rounded-xl border px-2 text-xs font-semibold ${
                      helpUrgency === urgency
                        ? urgency === 'critical' ? 'border-need bg-need text-white' : 'border-accent bg-accent text-white'
                        : 'border-line bg-surface-2 text-muted'
                    }`}
                  >
                    {urgency === 'normal' ? t('urgencyNormal') : urgency === 'urgent' ? t('urgencyUrgent') : t('urgencyCritical')}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted">{t('urgencySelfReported')}</p>
            </div>
          )}

          {helpKind === 'need' && helpCategory && latestStatusEvents(events).some(
            (event) => event.t === 'help' && event.st === 'need' && !event.resolved &&
              event.cat === helpCategory && event.gh === settings?.gh,
          ) && (
            <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs leading-relaxed text-warning">
              {t('duplicateHelpWarning')}
            </p>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-muted" htmlFor="help-note">
              {t('noteLabel')}
            </label>
            <textarea
              id="help-note"
              value={helpNote}
              onChange={(e) => setHelpNote(e.target.value)}
              placeholder={t('notePlaceholder')}
              maxLength={280}
              rows={3}
              className="w-full resize-none rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <AttachmentComposer value={helpAttachment} onChange={setHelpAttachment} />

          <label className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3">
            <input
              type="checkbox"
              checked={attachLoc}
              onChange={(e) => setAttachLoc(e.target.checked)}
              className="h-5 w-5 accent-accent"
            />
            <span className="flex-1 text-sm text-ink">{t('attachLocation')}</span>
          </label>
          {attachLoc && locState !== 'idle' && (
            <p className="-mt-2 text-xs text-muted">
              {locState === 'fetching' && t('locationFetching')}
              {locState === 'attached' && t('locationAttached')}
              {locState === 'unavailable' && t('locationUnavailable')}
            </p>
          )}

          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setHelpOpen(false)}
              className="min-h-12 flex-1 rounded-xl border border-line bg-surface-2 py-3 text-sm font-semibold text-ink"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              disabled={!helpCategory || busy}
              onClick={() => void submitHelp()}
              className="min-h-12 flex-1 rounded-xl bg-need py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              {t('send')}
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={personOpen} onClose={() => setPersonOpen(false)} title={t('personSheetTitle')}>
        <div className="flex flex-col gap-4 text-left">
          <div>
            <label className="mb-2 block text-sm font-medium text-muted" htmlFor="person-name">
              {t('personNameLabel')}
            </label>
            <input
              id="person-name"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder={t('personNamePlaceholder')}
              maxLength={48}
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <AttachmentComposer value={personAttachment} onChange={setPersonAttachment} />

          <div>
            <p className="mb-2 text-sm font-medium text-muted">{t('personAreaLabel')}</p>
            <AreaPicker value={personAreaCode} onChange={(area) => setPersonAreaCode(area.code)} />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-muted">{t('personStatusLabel')}</p>
            <div className="grid grid-cols-3 gap-2">
              {PERSON_STATUSES.map((pst) => (
                <button
                  key={pst}
                  type="button"
                  onClick={() => setPersonStatus(pst)}
                  className={`min-h-12 rounded-xl border px-2 py-3 text-xs font-semibold ${
                    personStatus === pst
                      ? pst === 'missing'
                        ? 'border-need bg-need text-white'
                        : 'border-safe bg-safe text-white'
                      : 'border-line bg-surface-2 text-muted'
                  }`}
                >
                  {personStatusLabel(pst)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-muted" htmlFor="person-note">
              {t('personNoteLabel')}
            </label>
            <textarea
              id="person-note"
              value={personNote}
              onChange={(e) => setPersonNote(e.target.value)}
              placeholder={t('notePlaceholder')}
              maxLength={280}
              rows={3}
              className="w-full resize-none rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setPersonOpen(false)}
              className="min-h-12 flex-1 rounded-xl border border-line bg-surface-2 py-3 text-sm font-semibold text-ink"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              disabled={!personName.trim() || busy}
              onClick={() => void submitPerson()}
              className={`min-h-12 flex-1 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-40 ${
                personStatus === 'missing' ? 'bg-need' : 'bg-safe'
              }`}
            >
              {t('send')}
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
