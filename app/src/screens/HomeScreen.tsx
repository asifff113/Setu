import {
  bulletinEvents,
  findAreaByCode,
  latestStatusEvents,
  type SetuAttachment,
  type SetuCategory,
  type SetuPersonStatus,
  type SetuStatus,
  type SetuUrgency,
} from '@setu/shared';
import { useEffect, useMemo, useRef, useState, type SVGProps } from 'react';
import { Link } from 'react-router-dom';
import { AreaPicker } from '../components/AreaPicker';
import { BottomSheet } from '../components/BottomSheet';
import { ConnectivityPill } from '../components/ConnectivityPill';
import { AttachmentComposer } from '../components/AttachmentComposer';
import { CoachMark } from '../components/CoachMark';
import { useI18n, type DictKey } from '../i18n';
import { areaLabel } from '../lib/area';
import { getCurrentLocation } from '../lib/geo';
import { timeAgo } from '../lib/time';
import { useAppStore } from '../store/appStore';
import { useEventsStore } from '../store/eventsStore';
import { circleMembers } from '../db/social';
import type { CircleRow } from '../db/schema';

const CATEGORIES: SetuCategory[] = ['med', 'rescue', 'food', 'water', 'shelter', 'other'];
const PERSON_STATUSES: SetuPersonStatus[] = ['missing', 'found', 'seen'];

/** Hero tones for my own latest status. Keyed by the three publishable states. */
const STATUS_TONE: Record<
  SetuStatus,
  { chip: string; text: string; wash: string; glyph: string; titleKey: DictKey }
> = {
  safe: {
    chip: 'bg-safe text-white',
    text: 'text-safe',
    wash: 'bg-safe/8',
    glyph: '✓',
    titleKey: 'homeStatusSafeTitle',
  },
  need: {
    chip: 'bg-need text-white',
    text: 'text-need',
    wash: 'bg-need/8',
    glyph: '!',
    titleKey: 'homeStatusNeedTitle',
  },
  offer: {
    chip: 'bg-accent text-white',
    text: 'text-accent',
    wash: 'bg-accent/8',
    glyph: '🤝',
    titleKey: 'homeStatusOfferTitle',
  },
};

/** Shared stroke style: round caps read better at the large hero-button size. */
function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

function SafeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth="2.6" {...props}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Icon>
  );
}

function HelpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth="2.4" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5" />
      <path d="M12 16.8h.01" />
    </Icon>
  );
}

function PersonSearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="10" cy="8" r="4" />
      <path d="M3 21a7 7 0 0 1 10.5-6.1" />
      <circle cx="17" cy="17" r="3" />
      <path d="m19.5 19.5 2 2" />
    </Icon>
  );
}

function OfferIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M12 20.2S4 15.6 4 10.3A4.3 4.3 0 0 1 12 7.9a4.3 4.3 0 0 1 8 2.4c0 5.3-8 9.9-8 9.9Z" />
    </Icon>
  );
}

function ChevronIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth="2.2" {...props}>
      <path d="m9 6 6 6-6 6" />
    </Icon>
  );
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function HomeScreen() {
  const { t, lang, categoryLabel, categoryIcon, personStatusLabel } = useI18n();
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

  // One derivation feeds the hero, the live counts, the circle strip, and the
  // duplicate-request warning — it was recomputed per consumer before.
  const statuses = useMemo(() => latestStatusEvents(events), [events]);
  const myStatus = useMemo(
    () => (identity ? statuses.find((event) => event.au === identity.author) : undefined),
    [statuses, identity],
  );
  const statusByAuthor = useMemo(() => {
    const map = new Map<string, (typeof statuses)[number]>();
    for (const event of statuses) if (!map.has(event.au)) map.set(event.au, event);
    return map;
  }, [statuses]);

  const areaName = areaLabel(settings?.gh ?? '', lang);

  /** Live counts, scoped to my area when one is set (same rule as the Board). */
  const glance = useMemo(() => {
    const gh = settings?.gh ?? '';
    const muted = new Set(settings?.mutedAuthors ?? []);
    const nearby = statuses.filter(
      (event) => !muted.has(event.au) && (!gh || event.gh.startsWith(gh)),
    );
    return {
      needs: nearby.filter((e) => e.t === 'help' && e.st === 'need' && !e.resolved).length,
      safe: nearby.filter((e) => e.t === 'checkin' && e.st === 'safe').length,
      // Bulletins are often national (empty geohash), so those always count.
      alerts: bulletinEvents(events).filter(
        (e) => !muted.has(e.au) && (!gh || !e.gh || e.gh.startsWith(gh)),
      ).length,
    };
  }, [statuses, events, settings?.gh, settings?.mutedAuthors]);

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

  const tone = myStatus?.st ? STATUS_TONE[myStatus.st] : undefined;
  const displayName = settings?.name.trim() || t('infoProfileNoName');

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-4 pb-6">
      {/* Who am I, where am I, and what did I last publish — one card instead
          of a title banner, a nudge box, and a status card fighting for space. */}
      <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/12 text-base font-bold text-accent"
          >
            {displayName.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink">{displayName}</p>
            <p className="truncate text-xs text-muted">{areaName || t('infoProfileNoArea')}</p>
          </div>
          <ConnectivityPill />
        </div>

        <div className={`flex items-start gap-3 border-t border-line px-4 py-3.5 ${tone?.wash ?? ''}`}>
          <span
            aria-hidden="true"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg font-bold ${
              tone?.chip ?? 'bg-surface-2 text-muted'
            }`}
          >
            {tone?.glyph ?? '?'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              {t('statusCardTitle')}
            </p>
            <p className={`mt-0.5 text-sm font-bold leading-snug ${tone?.text ?? 'text-ink'}`}>
              {tone ? t(tone.titleKey) : t('statusNone')}
            </p>
            {myStatus?.cat && (
              <p className="mt-1 text-xs font-medium text-muted">
                {categoryIcon(myStatus.cat)} {categoryLabel(myStatus.cat)}
              </p>
            )}
            {myStatus?.msg && (
              <p className="mt-1 text-xs leading-relaxed text-ink/75">{myStatus.msg}</p>
            )}
            {!myStatus && (
              <p className="mt-1 text-xs leading-relaxed text-muted">{t('homeSafeNudge')}</p>
            )}
          </div>
          {myStatus && (
            <span className="shrink-0 whitespace-nowrap text-[11px] text-muted">
              {timeAgo(myStatus.ts, lang)}
            </span>
          )}
        </div>
      </section>

      <CoachMark id="manual">
        {t('coachManual')}{' '}
        <Link to="/manual" className="font-semibold text-accent underline">
          {t('moreManual')}
        </Link>
      </CoachMark>

      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
          {t('homeQuickTitle')}
        </h2>

        {/* Two life-critical actions, identical footprint side by side. */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={busy}
            aria-busy={busy}
            onClick={() => void submitSafe()}
            className="flex min-h-32 flex-col items-center justify-center gap-2.5 rounded-3xl bg-safe px-3 py-5 text-white shadow-lg shadow-safe/25 transition active:scale-[0.97] disabled:opacity-50"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
              <SafeIcon className="h-7 w-7" aria-hidden="true" />
            </span>
            <span className="text-center text-base font-bold leading-tight">{t('btnSafe')}</span>
          </button>
          <button
            type="button"
            disabled={busy}
            aria-busy={busy}
            onClick={() => openHelp('need')}
            className="flex min-h-32 flex-col items-center justify-center gap-2.5 rounded-3xl bg-need px-3 py-5 text-white shadow-lg shadow-need/25 transition active:scale-[0.97] disabled:opacity-50"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
              <HelpIcon className="h-7 w-7" aria-hidden="true" />
            </span>
            <span className="text-center text-base font-bold leading-tight">{t('btnHelp')}</span>
          </button>
        </div>

        {/* `auto-rows-fr` keeps both rows the same height whatever the label
            wraps to — Bangla and English strings differ a lot in length. */}
        <div className="grid auto-rows-fr gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => openHelp('offer')}
            className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left shadow-sm transition active:scale-[0.99] disabled:opacity-50"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-safe/12 text-safe">
              <OfferIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">{t('btnOffer')}</span>
              <span className="mt-0.5 block text-xs leading-snug text-muted">
                {t('btnOfferHint')}
              </span>
            </span>
            <ChevronIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={openPerson}
            className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left shadow-sm transition active:scale-[0.99] disabled:opacity-50"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent">
              <PersonSearchIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">{t('btnReportPerson')}</span>
              <span className="mt-0.5 block text-xs leading-snug text-muted">
                {t('btnReportPersonHint')}
              </span>
            </span>
            <ChevronIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 pt-3.5">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            {t('homeGlanceTitle')}
          </h2>
          <span className="truncate text-[11px] text-muted">{areaName || t('homeGlanceAll')}</span>
        </div>
        <div className="mt-1.5 grid grid-cols-3 divide-x divide-line">
          {(
            [
              { to: '/board', value: glance.needs, labelKey: 'homeGlanceNeeds', tint: glance.needs > 0 ? 'text-need' : 'text-ink' },
              { to: '/people', value: glance.safe, labelKey: 'homeGlanceSafe', tint: glance.safe > 0 ? 'text-safe' : 'text-ink' },
              { to: '/alerts', value: glance.alerts, labelKey: 'homeGlanceAlerts', tint: glance.alerts > 0 ? 'text-warning' : 'text-ink' },
            ] as const
          ).map((stat) => (
            <Link
              key={stat.to}
              to={stat.to}
              className="flex flex-col items-center gap-0.5 px-2 py-3 text-center active:opacity-70"
            >
              <span className={`text-2xl font-bold leading-none ${stat.tint}`}>{stat.value}</span>
              <span className="text-[11px] font-medium leading-tight text-muted">
                {t(stat.labelKey)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {circle.length > 0 && (
        <section className="rounded-3xl border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              {t('circleTitle')}
            </h2>
            <Link to="/circle" className="text-xs font-semibold text-accent">
              {t('circleManage')}
            </Link>
          </div>
          <div className="-mx-1 mt-3 flex snap-x gap-1 overflow-x-auto pb-1">
            {circle.map((member) => {
              const status = statusByAuthor.get(member.au);
              return (
                <div key={member.au} className="w-18.5 shrink-0 snap-start px-1 text-center">
                  <span
                    aria-hidden="true"
                    className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-base font-bold ${
                      status?.st === 'safe'
                        ? 'bg-safe/15 text-safe'
                        : status?.st === 'need'
                          ? 'bg-need/15 text-need'
                          : 'bg-surface-2 text-muted'
                    }`}
                  >
                    {status?.st === 'safe' ? '✓' : status?.st === 'need' ? '!' : '?'}
                  </span>
                  <p className="mt-1.5 truncate text-xs font-semibold text-ink">{member.name}</p>
                  <p className="truncate text-[10px] text-muted">
                    {status ? timeAgo(status.ts, lang) : t('circleNoStatus')}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink shadow-xl"
        >
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

          {helpKind === 'need' && helpCategory && statuses.some(
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
            <AreaPicker value={personAreaCode} onChange={(area) => setPersonAreaCode(area?.code ?? null)} />
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
