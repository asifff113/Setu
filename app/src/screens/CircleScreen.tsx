import { latestStatusEvents } from '@setu/shared';
import QRCode from 'qrcode';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { addCircleMember, circleMembers, removeCircleMember } from '../db/social';
import type { CircleRow } from '../db/schema';
import { useI18n } from '../i18n';
import { timeAgo } from '../lib/time';
import { useAppStore } from '../store/appStore';
import { useEventsStore } from '../store/eventsStore';

const QrScanner = lazy(() => import('../sync/QrScanner').then((module) => ({ default: module.QrScanner })));
const AUTHOR_RE = /^[A-Za-z0-9_-]{43}$/;

export function CircleScreen() {
  const { t, lang } = useI18n();
  const identity = useAppStore((state) => state.identity);
  const settings = useAppStore((state) => state.settings);
  const events = useEventsStore((state) => state.events);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [members, setMembers] = useState<CircleRow[]>([]);
  const [scanning, setScanning] = useState(false);
  const [notice, setNotice] = useState('');

  const payload = useMemo(
    () => `setu-circle:${JSON.stringify({ au: identity?.author, name: settings?.name || t('unknownName') })}`,
    [identity?.author, settings?.name, t],
  );
  const statuses = useMemo(() => latestStatusEvents(events), [events]);

  async function refresh(): Promise<void> {
    setMembers(await circleMembers());
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (canvas.current && identity?.author) {
      void QRCode.toCanvas(canvas.current, payload, { width: 230, margin: 2 });
    }
  }, [identity?.author, payload]);

  async function accept(raw: string): Promise<void> {
    setScanning(false);
    try {
      if (!raw.startsWith('setu-circle:')) throw new Error('invalid');
      const parsed = JSON.parse(raw.slice('setu-circle:'.length)) as { au?: unknown; name?: unknown };
      if (typeof parsed.au !== 'string' || !AUTHOR_RE.test(parsed.au) || parsed.au === identity?.author) {
        throw new Error('invalid');
      }
      await addCircleMember(parsed.au, typeof parsed.name === 'string' ? parsed.name : t('unknownName'));
      await refresh();
      setNotice(t('circleAdded'));
    } catch {
      setNotice(t('circleInvalid'));
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">{t('circleTitle')}</h1>
        <p className="mt-1 text-sm text-muted">{t('circleHint')}</p>
      </div>
      <section className="rounded-3xl border border-line bg-surface p-5 text-center shadow-sm">
        <p className="text-sm font-semibold text-ink">{t('circleMyCode')}</p>
        <div className="mx-auto mt-4 w-fit rounded-2xl bg-white p-3">
          <canvas ref={canvas} className="block max-w-full" />
        </div>
        <button type="button" onClick={() => setScanning(true)} className="mt-4 min-h-12 w-full rounded-xl bg-accent text-sm font-semibold text-white">
          {t('circleScan')}
        </button>
      </section>
      <section>
        <h2 className="mb-3 text-sm font-bold text-ink">{t('circleMembers')}</h2>
        {members.length === 0 && <p className="rounded-xl bg-surface px-4 py-6 text-center text-sm text-muted">{t('circleEmpty')}</p>}
        <div className="flex flex-col gap-2">
          {members.map((member) => {
            const status = statuses.find((event) => event.au === member.au);
            return (
              <div key={member.au} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-sm">
                <span className={`flex h-11 w-11 items-center justify-center rounded-full text-lg ${
                  status?.st === 'safe' ? 'bg-safe/15' : status?.st === 'need' ? 'bg-need/15' : 'bg-surface-2'
                }`}>
                  {status?.st === 'safe' ? '✓' : status?.st === 'need' ? '!' : '?'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{member.name}</p>
                  <p className="text-xs text-muted">
                    {status ? `${status.st === 'safe' ? t('statusSafe') : t('statusNeed')} · ${timeAgo(status.ts, lang)}` : t('circleNoStatus')}
                  </p>
                </div>
                <button type="button" aria-label={t('circleRemove')} onClick={() => void removeCircleMember(member.au).then(refresh)} className="rounded-lg px-2 py-2 text-need">
                  ×
                </button>
              </div>
            );
          })}
        </div>
      </section>
      {notice && <p role="status" className="text-center text-sm font-medium text-accent">{notice}</p>}
      <Suspense fallback={null}>
        {scanning && (
          <QrScanner
            title={t('circleScan')}
            hint={t('circleScanHint')}
            onClose={() => setScanning(false)}
            onResult={(value) => void accept(value)}
          />
        )}
      </Suspense>
    </div>
  );
}
