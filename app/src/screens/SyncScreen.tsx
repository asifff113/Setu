import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ingestEvents } from '../db/events';
import { useI18n, type DictKey } from '../i18n';
import {
  decodeBundle,
  encodeBundle,
  filterForBundle,
  MAX_COMPRESSED_BUNDLE_BYTES,
  type BundleFilter,
} from '../lib/bundle';
import { timeAgo, toBnDigits } from '../lib/time';
import { useAppStore } from '../store/appStore';
import { useEventsStore } from '../store/eventsStore';
import { useSyncStore, type SyncStatus } from '../store/syncStore';

// The transport overlays pull in the heavy codecs (jsQR + QR generation for
// Beam, the ggwave WASM for Chirp) and only mount when the user opens one, so
// they load lazily as their own chunks. All are precached by the PWA, so an
// offline device still opens them instantly.
const BeamReceiver = lazy(() => import('../sync/beam/BeamReceiver').then((m) => ({ default: m.BeamReceiver })));
const BeamSender = lazy(() => import('../sync/beam/BeamSender').then((m) => ({ default: m.BeamSender })));
const ChirpReceiver = lazy(() => import('../sync/chirp/ChirpReceiver').then((m) => ({ default: m.ChirpReceiver })));
const ChirpSender = lazy(() => import('../sync/chirp/ChirpSender').then((m) => ({ default: m.ChirpSender })));
const QrScanner = lazy(() => import('../sync/QrScanner').then((m) => ({ default: m.QrScanner })));

const STATUS_META: Record<SyncStatus, { icon: string; key: DictKey; tint: string }> = {
  relay: { icon: '🟢', key: 'syncStatusRelay', tint: 'text-safe' },
  node: { icon: '🟡', key: 'syncStatusNode', tint: 'text-yellow-400' },
  connecting: { icon: '🟡', key: 'syncStatusConnecting', tint: 'text-yellow-400' },
  offline: { icon: '🔴', key: 'syncStatusOffline', tint: 'text-white/60' },
};

const EXPORT_FILTERS: { value: BundleFilter; key: DictKey }[] = [
  { value: 'all', key: 'syncExportFilterAll' },
  { value: 'area', key: 'syncExportFilterArea' },
  { value: 'day', key: 'syncExportFilterDay' },
];

export function SyncScreen() {
  const { t, lang } = useI18n();
  const status = useSyncStore((s) => s.status);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const nodeUrl = useSyncStore((s) => s.nodeUrl);
  const eventCount = useSyncStore((s) => s.eventCount);
  const storageBytes = useSyncStore((s) => s.storageBytes);
  const connectNode = useSyncStore((s) => s.connectNode);
  const disconnectNode = useSyncStore((s) => s.disconnectNode);
  const refreshStats = useSyncStore((s) => s.refreshStats);

  const events = useEventsStore((s) => s.events);
  const refreshEvents = useEventsStore((s) => s.refresh);
  const myGh = useAppStore((s) => s.settings?.gh ?? '');
  const author = useAppStore((s) => s.identity?.author);

  const [nodeInput, setNodeInput] = useState('');
  const [nodeError, setNodeError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [beamMode, setBeamMode] = useState<'send' | 'scan' | null>(null);
  const [chirpMode, setChirpMode] = useState<'send' | 'listen' | null>(null);
  const [exportFilter, setExportFilter] = useState<BundleFilter>('all');
  const [fileMsg, setFileMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  const num = (n: number): string => (lang === 'bn' ? toBnDigits(n) : String(n));

  function formatBytes(bytes: number | null): string {
    if (bytes === null) return '—';
    if (bytes < 1024) return `${num(bytes)} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${num(Math.round(kb))} KB`;
    return `${num(Math.round((kb / 1024) * 10) / 10)} MB`;
  }

  function submitNode(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const err = connectNode(trimmed);
    if (err) {
      setNodeError(t(err as DictKey));
    } else {
      setNodeError(null);
      setNodeInput('');
    }
  }

  async function handleExport() {
    const selected = filterForBundle(events, exportFilter, myGh);
    if (selected.length === 0) {
      setFileMsg({ tone: 'err', text: t('syncExportEmpty') });
      return;
    }
    const bytes = await encodeBundle(selected);
    const blob = new Blob([bytes as BlobPart], { type: 'application/octet-stream' });
    const name = `setu-${new Date().toISOString().slice(0, 10)}.setu`;
    const file = new File([blob], name, { type: 'application/octet-stream' });

    // Prefer the native share sheet (Android); fall back to a plain download.
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: t('syncFileTitle') });
        return;
      } catch {
        /* user cancelled or share failed → fall through to download */
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(fileList: FileList | null) {
    const file = fileList?.[0];
    if (importRef.current) importRef.current.value = ''; // allow re-picking same file
    if (!file) return;
    try {
      if (file.size > MAX_COMPRESSED_BUNDLE_BYTES) throw new Error('file too large');
      const bytes = new Uint8Array(await file.arrayBuffer());
      const imported = await decodeBundle(bytes);
      const res = await ingestEvents(imported);
      if (res.added > 0) {
        await refreshEvents();
        void refreshStats();
      }
      setFileMsg({
        tone: 'ok',
        text: `${t('syncImportDone')} — ${num(res.added)} ${t('beamNew')}, ${num(res.known)} ${t('beamKnown')}`,
      });
    } catch {
      setFileMsg({ tone: 'err', text: t('syncFileFailed') });
    }
  }

  const meta = STATUS_META[status];

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-6 pb-8">
      <h1 className="px-1 text-2xl font-bold text-white">{t('syncTitle')}</h1>

      {/* QR Beam — the offline showpiece */}
      <section className="rounded-2xl bg-surface p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-white/40">
          {t('syncBeamTitle')}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-white/40">{t('syncBeamHint')}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setBeamMode('send')}
            className="flex flex-col items-center gap-1 rounded-xl bg-accent py-4 text-sm font-semibold text-white active:opacity-90"
          >
            <span className="text-2xl" aria-hidden="true">
              🔦
            </span>
            {t('syncBeamSend')}
          </button>
          <button
            type="button"
            onClick={() => setBeamMode('scan')}
            className="flex flex-col items-center gap-1 rounded-xl bg-surface-2 py-4 text-sm font-semibold text-white active:opacity-80"
          >
            <span className="text-2xl" aria-hidden="true">
              📷
            </span>
            {t('syncBeamScan')}
          </button>
        </div>
      </section>

      {/* Chirp — data over sound, the last-resort transport */}
      <section className="rounded-2xl bg-surface p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-white/40">
          {t('syncChirpTitle')}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-white/40">{t('syncChirpHint')}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setChirpMode('send')}
            className="flex flex-col items-center gap-1 rounded-xl bg-accent py-4 text-sm font-semibold text-white active:opacity-90"
          >
            <span className="text-2xl" aria-hidden="true">
              📢
            </span>
            {t('syncChirpSend')}
          </button>
          <button
            type="button"
            onClick={() => setChirpMode('listen')}
            className="flex flex-col items-center gap-1 rounded-xl bg-surface-2 py-4 text-sm font-semibold text-white active:opacity-80"
          >
            <span className="text-2xl" aria-hidden="true">
              🎧
            </span>
            {t('syncChirpListen')}
          </button>
        </div>
      </section>

      {/* Relay / auto status */}
      <section className="rounded-2xl bg-surface p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-white/40">
              {t('syncRelayTitle')}
            </p>
            <p className={`mt-1 flex items-center gap-2 text-lg font-semibold ${meta.tint}`}>
              <span aria-hidden="true">{meta.icon}</span>
              <span>{t(meta.key)}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/40">{t('syncLastSync')}</p>
            <p className="text-sm text-white/80">
              {lastSyncAt ? timeAgo(lastSyncAt, lang) : t('syncNever')}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-white/40">{t('syncRelayHint')}</p>
      </section>

      {/* Connect to local node */}
      <section className="rounded-2xl bg-surface p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-white/40">
          {t('syncNodeTitle')}
        </p>

        {nodeUrl ? (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5">
              <span aria-hidden="true">💻</span>
              <span className="flex-1 break-all font-mono text-xs text-white/80">{nodeUrl}</span>
            </div>
            <button
              type="button"
              onClick={() => disconnectNode()}
              className="rounded-xl bg-surface-2 py-3 text-sm font-medium text-white/80 active:opacity-80"
            >
              {t('syncNodeDisconnect')}
            </button>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-xs leading-relaxed text-white/40">{t('syncNodeHint')}</p>
            <input
              value={nodeInput}
              onChange={(e) => {
                setNodeInput(e.target.value);
                setNodeError(null);
              }}
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder={t('syncNodePlaceholder')}
              className="w-full rounded-xl bg-surface-2 px-4 py-3 font-mono text-sm text-white placeholder:font-sans placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {nodeError && <p className="-mt-1 text-xs text-need">{nodeError}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setScanning(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-surface-2 py-3 text-sm font-medium text-white/90 active:opacity-80"
              >
                <span aria-hidden="true">📷</span>
                {t('syncNodeScan')}
              </button>
              <button
                type="button"
                disabled={!nodeInput.trim()}
                onClick={() => submitNode(nodeInput)}
                className="flex-1 rounded-xl bg-accent py-3 text-sm font-semibold text-white active:opacity-90 disabled:opacity-40"
              >
                {t('syncNodeConnect')}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* File export / import — a free extra transport */}
      <section className="rounded-2xl bg-surface p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-white/40">
          {t('syncFileTitle')}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-white/40">{t('syncFileHint')}</p>

        <div className="mt-3 flex gap-1.5 rounded-xl bg-surface-2 p-1">
          {EXPORT_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setExportFilter(f.value)}
              className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
                exportFilter === f.value ? 'bg-accent text-white' : 'text-white/60'
              }`}
            >
              {t(f.key)}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-3">
          <button
            type="button"
            onClick={() => void handleExport()}
            className="flex-1 rounded-xl bg-surface-2 py-3 text-sm font-medium text-white/90 active:opacity-80"
          >
            {t('syncExport')}
          </button>
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            className="flex-1 rounded-xl bg-surface-2 py-3 text-sm font-medium text-white/90 active:opacity-80"
          >
            {t('syncImport')}
          </button>
        </div>
        {fileMsg && (
          <p className={`mt-3 text-xs ${fileMsg.tone === 'ok' ? 'text-safe' : 'text-need'}`}>
            {fileMsg.text}
          </p>
        )}
        <input
          ref={importRef}
          type="file"
          accept=".setu,application/octet-stream"
          className="hidden"
          onChange={(e) => void handleImport(e.target.files)}
        />
      </section>

      {/* Storage / stats */}
      <section className="rounded-2xl bg-surface p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-white/40">
          {t('syncStatsTitle')}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface-2 px-3 py-3 text-center">
            <p className="text-2xl font-bold text-white">{num(eventCount)}</p>
            <p className="mt-0.5 text-xs text-white/50">{t('syncEventCount')}</p>
          </div>
          <div className="rounded-xl bg-surface-2 px-3 py-3 text-center">
            <p className="text-2xl font-bold text-white">{formatBytes(storageBytes)}</p>
            <p className="mt-0.5 text-xs text-white/50">{t('syncStorageUsed')}</p>
          </div>
        </div>
      </section>

      <Suspense fallback={null}>
        {beamMode === 'send' && (
          <BeamSender events={events} onClose={() => setBeamMode(null)} />
        )}
        {beamMode === 'scan' && <BeamReceiver onClose={() => setBeamMode(null)} />}

        {chirpMode === 'send' && (
          <ChirpSender events={events} author={author} onClose={() => setChirpMode(null)} />
        )}
        {chirpMode === 'listen' && <ChirpReceiver onClose={() => setChirpMode(null)} />}

        {scanning && (
          <QrScanner
            title={t('syncNodeScanTitle')}
            hint={t('syncNodeScanHint')}
            onClose={() => setScanning(false)}
            onResult={(text) => {
              setScanning(false);
              setNodeInput(text);
              submitNode(text);
            }}
          />
        )}
      </Suspense>
    </div>
  );
}
