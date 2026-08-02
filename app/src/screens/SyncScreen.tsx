import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
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
import { isPrivateWsUrl, normalizeNodeUrl, nodeWsToHttpUrl } from '../sync/wsurl';
import { CoachMark } from '../components/CoachMark';
import { isNative } from '../lib/platform';

import QRCode from 'qrcode';
import { processSharedBundle } from '../lib/shareReceive';
import { decodePosterPayload, encodePosterPayload, POSTER_PREFIX } from '../lib/poster';
import {
  DirectWebRtcSync,
  WEBRTC_ANSWER_PREFIX,
  WEBRTC_OFFER_PREFIX,
} from '../lib/webrtcSync';

const BeamReceiver = lazy(() => import('../sync/beam/BeamReceiver').then((m) => ({ default: m.BeamReceiver })));
const BeamSender = lazy(() => import('../sync/beam/BeamSender').then((m) => ({ default: m.BeamSender })));
const ChirpReceiver = lazy(() => import('../sync/chirp/ChirpReceiver').then((m) => ({ default: m.ChirpReceiver })));
const ChirpSender = lazy(() => import('../sync/chirp/ChirpSender').then((m) => ({ default: m.ChirpSender })));
const QrScanner = lazy(() => import('../sync/QrScanner').then((m) => ({ default: m.QrScanner })));

const STATUS_META: Record<SyncStatus, { key: DictKey; dot: string; tint: string }> = {
  relay: { key: 'syncStatusRelay', dot: 'bg-safe', tint: 'text-safe' },
  node: { key: 'syncStatusNode', dot: 'bg-warning', tint: 'text-warning' },
  connecting: { key: 'syncStatusConnecting', dot: 'bg-warning', tint: 'text-warning' },
  offline: { key: 'syncStatusOffline', dot: 'bg-muted', tint: 'text-muted' },
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

  const [posterFilter, setPosterFilter] = useState<BundleFilter>('area');
  const [posterDataUrl, setPosterDataUrl] = useState<string>('');
  const [posterEventCount, setPosterEventCount] = useState<number>(0);
  const [posterTimestamp, setPosterTimestamp] = useState<string>('');

  useEffect(() => {
    const selected = filterForBundle(events, posterFilter, myGh);
    void encodePosterPayload(selected).then(({ payload, count }) => {
      setPosterEventCount(count);
      setPosterTimestamp(new Date().toLocaleTimeString());
      if (payload) {
        void QRCode.toDataURL(payload, { errorCorrectionLevel: 'L', width: 512, margin: 2 }).then(
          setPosterDataUrl,
        );
      } else {
        setPosterDataUrl('');
      }
    });
  }, [events, posterFilter, myGh]);

  const [nfcStatus, setNfcStatus] = useState<'idle' | 'writing' | 'success' | 'failure'>('idle');
  const supportsNfc = typeof window !== 'undefined' && 'NDEFReader' in window;

  const [webrtcSync, setWebrtcSync] = useState<DirectWebRtcSync | null>(null);
  const [webrtcQrUrl, setWebrtcQrUrl] = useState<string>('');
  const [webrtcStep, setWebrtcStep] = useState<'idle' | 'offer' | 'answer' | 'connected'>('idle');

  async function startWebrtcOffer() {
    const rtc = new DirectWebRtcSync();
    setWebrtcSync(rtc);
    rtc.onReceiveBundle = async (res) => {
      await refreshEvents();
      void refreshStats();
      setFileMsg({
        tone: 'ok',
        text: `WebRTC Sync — ${t('beamNew')}: ${toBnDigits(res.added)}, ${t('beamKnown')}: ${toBnDigits(res.known)}`,
      });
      setWebrtcStep('connected');
    };
    const offerPayload = await rtc.createOffer();
    const dataUrl = await QRCode.toDataURL(offerPayload, { errorCorrectionLevel: 'L', width: 400 });
    setWebrtcQrUrl(dataUrl);
    setWebrtcStep('offer');
  }

  async function handleNfcWrite() {
    if (!nodeUrl || !supportsNfc) return;
    setNfcStatus('writing');
    try {
      const httpUrl = nodeWsToHttpUrl(nodeUrl);
      const ndef = new (window as any).NDEFReader();
      await ndef.write({
        records: [{ recordType: 'url', data: httpUrl }],
      });
      setNfcStatus('success');
    } catch {
      setNfcStatus('failure');
    }
  }

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('shared') === '1') {
      url.searchParams.delete('shared');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);

      void processSharedBundle().then(async (res) => {
        if (res) {
          await refreshEvents();
          await refreshStats();
          setFileMsg({
            tone: 'ok',
            text: `${t('syncSharedReceived')} — ${t('beamNew')}: ${toBnDigits(res.added)}, ${t('beamKnown')}: ${toBnDigits(res.known)}`,
          });
        } else {
          setFileMsg({ tone: 'err', text: t('syncFileFailed') });
        }
      });
    }
  }, [refreshEvents, refreshStats, t]);

  const insecureNodeWarning = useMemo(() => {
    const url = normalizeNodeUrl(nodeInput);
    return !!url && url.startsWith('ws://') && !isPrivateWsUrl(url);
  }, [nodeInput]);

  const num = (n: number): string => (lang === 'bn' ? toBnDigits(n) : String(n));

  function formatBytes(bytes: number | null): string {
    if (bytes === null) return '-';
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
    const name = `setu-${new Date().toISOString().slice(0, 10)}.setu`;

    if (isNative()) {
      try {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');

        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        const writeRes = await Filesystem.writeFile({
          path: name,
          data: base64,
          directory: Directory.Cache,
        });

        await Share.share({
          title: t('syncFileTitle'),
          files: [writeRes.uri],
        });
        return;
      } catch {
        // Fall back to standard flow if user cancels or fails
      }
    }

    const blob = new Blob([bytes as BlobPart], { type: 'application/octet-stream' });
    const file = new File([blob], name, { type: 'application/octet-stream' });

    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: t('syncFileTitle') });
        return;
      } catch {
        // Fall back to a normal download when the native share sheet closes or fails.
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
    if (importRef.current) importRef.current.value = '';
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
        text: `${t('syncImportDone')} - ${num(res.added)} ${t('beamNew')}, ${num(res.known)} ${t('beamKnown')}`,
      });
    } catch {
      setFileMsg({ tone: 'err', text: t('syncFileFailed') });
    }
  }

  const meta = STATUS_META[status];

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-6 pb-8">
      <h1 className="px-1 text-2xl font-bold text-ink">{t('syncTitle')}</h1>
      <CoachMark id="connect">{t('coachConnect')}</CoachMark>

      <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t('syncRelayTitle')}
            </p>
            <p className={`mt-2 flex items-center gap-2 text-lg font-bold ${meta.tint}`}>
              <span className={`h-3 w-3 rounded-full ${meta.dot}`} aria-hidden="true" />
              <span>{t(meta.key)}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">{t('syncLastSync')}</p>
            <p className="text-sm font-semibold text-ink">
              {lastSyncAt ? timeAgo(lastSyncAt, lang) : t('syncNever')}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted">{t('syncRelayHint')}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-surface-2 px-3 py-3 text-center">
            <p className="text-2xl font-bold text-ink">{num(eventCount)}</p>
            <p className="mt-0.5 text-xs text-muted">{t('syncEventCount')}</p>
          </div>
          <div className="rounded-2xl bg-surface-2 px-3 py-3 text-center">
            <p className="text-2xl font-bold text-ink">{formatBytes(storageBytes)}</p>
            <p className="mt-0.5 text-xs text-muted">{t('syncStorageUsed')}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-surface p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4">
            <p className="text-sm font-bold text-ink">{t('syncBeamTitle')}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t('syncBeamHint')}</p>
            <p className="mt-1 text-xs text-muted font-medium">{t('syncCourierHint')}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setBeamMode('send')}
                className="min-h-12 rounded-xl bg-accent px-3 py-3 text-sm font-semibold text-white active:opacity-90"
              >
                {t('syncBeamSend')}
              </button>
              <button
                type="button"
                onClick={() => setBeamMode('scan')}
                className="min-h-12 rounded-xl border border-line bg-surface px-3 py-3 text-sm font-semibold text-ink active:opacity-80"
              >
                {t('syncBeamScan')}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-accent/20 bg-surface p-4">
            <p className="text-sm font-bold text-ink">{t('syncChirpTitle')}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t('syncChirpHint')}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setChirpMode('send')}
                className="min-h-12 rounded-xl bg-accent px-3 py-3 text-sm font-semibold text-white active:opacity-90"
              >
                {t('syncChirpSend')}
              </button>
              <button
                type="button"
                onClick={() => setChirpMode('listen')}
                className="min-h-12 rounded-xl border border-line bg-surface-2 px-3 py-3 text-sm font-semibold text-ink active:opacity-80"
              >
                {t('syncChirpListen')}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t('syncNodeTitle')}
        </p>

        {nodeUrl ? (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-warning" aria-hidden="true" />
              <span className="flex-1 break-all font-mono text-xs text-ink">{nodeUrl}</span>
            </div>
            <button
              type="button"
              onClick={() => disconnectNode()}
              className="min-h-12 rounded-xl border border-line bg-surface-2 py-3 text-sm font-semibold text-ink active:opacity-80"
            >
              {t('syncNodeDisconnect')}
            </button>
            {supportsNfc && (
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => void handleNfcWrite()}
                  disabled={nfcStatus === 'writing'}
                  className="min-h-12 rounded-xl bg-accent py-3 text-sm font-semibold text-white active:opacity-90 disabled:opacity-50"
                >
                  📱 {t('nfcWriteButton')}
                </button>
                {nfcStatus === 'writing' && (
                  <p className="text-xs text-amber-500 font-medium">{t('nfcWritingPrompt')}</p>
                )}
                {nfcStatus === 'success' && (
                  <p className="text-xs text-safe font-medium">{t('nfcWriteSuccess')}</p>
                )}
                {nfcStatus === 'failure' && (
                  <p className="text-xs text-need font-medium">{t('nfcWriteFailure')}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-muted">{t('syncNodeHint')}</p>
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
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 font-mono text-sm text-ink placeholder:font-sans placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {nodeError && <p className="-mt-1 text-xs text-need">{nodeError}</p>}
            {!nodeError && insecureNodeWarning && (
              <p className="-mt-1 text-xs text-warning">{t('syncNodeInsecureWarning')}</p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setScanning(true)}
                className="min-h-12 flex-1 rounded-xl border border-line bg-surface-2 py-3 text-sm font-semibold text-ink active:opacity-80"
              >
                {t('syncNodeScan')}
              </button>
              <button
                type="button"
                disabled={!nodeInput.trim()}
                onClick={() => submitNode(nodeInput)}
                className="min-h-12 flex-1 rounded-xl bg-accent py-3 text-sm font-semibold text-white active:opacity-90 disabled:opacity-40"
              >
                {t('syncNodeConnect')}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t('syncFileTitle')}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t('syncFileHint')}</p>

        <div className="mt-3 flex gap-1.5 rounded-xl bg-surface-2 p-1">
          {EXPORT_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setExportFilter(f.value)}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                exportFilter === f.value ? 'bg-accent text-white' : 'text-muted'
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
            className="min-h-12 flex-1 rounded-xl border border-line bg-surface-2 py-3 text-sm font-semibold text-ink active:opacity-80"
          >
            {t('syncExport')}
          </button>
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            className="min-h-12 flex-1 rounded-xl border border-line bg-surface-2 py-3 text-sm font-semibold text-ink active:opacity-80"
          >
            {t('syncImport')}
          </button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">{t('syncExportBluetoothHint')}</p>
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

      {/* Feature D: Printable Poster QR Section */}
      <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t('posterTitle')}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t('posterHint')}</p>

        <div className="mt-3 flex gap-1.5 rounded-xl bg-surface-2 p-1">
          {EXPORT_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setPosterFilter(f.value)}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                posterFilter === f.value ? 'bg-accent text-white' : 'text-muted'
              }`}
            >
              {t(f.key)}
            </button>
          ))}
        </div>

        {posterDataUrl ? (
          <div className="mt-4 flex flex-col items-center gap-3">
            {/* Screen Preview */}
            <div className="rounded-2xl border border-line bg-white p-3 shadow-inner text-center">
              <img src={posterDataUrl} alt="Poster QR Code" className="mx-auto h-48 w-48 block" />
              <p className="mt-2 text-xs font-semibold text-black">
                {t('posterEventCount')} {toBnDigits(posterEventCount)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-12 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white active:opacity-90"
            >
              🖨️ {t('posterPrintButton')}
            </button>

            {/* Print View Wrapper */}
            <div className="hidden poster-print">
              <div className="flex flex-col items-center text-center p-8 border-4 border-black rounded-3xl">
                <h1 className="text-4xl font-extrabold text-black">সেতু Setu</h1>
                <p className="text-lg font-semibold text-gray-700 mt-1">
                  Crisis Communication Dead-Drop Poster
                </p>
                <div className="my-6 border-2 border-black p-4 rounded-2xl bg-white">
                  <img src={posterDataUrl} alt="Poster QR" className="w-96 h-96 block" />
                </div>
                <p className="text-xl font-bold text-black max-w-md leading-relaxed">
                  {t('posterScanInstruction')}
                </p>
                <div className="mt-6 text-sm text-gray-600 flex justify-between w-full max-w-md border-t pt-4">
                  <span>{t('posterEventCount')} {posterEventCount}</span>
                  <span>{t('posterGeneratedAt')} {posterTimestamp}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted">{t('syncExportEmpty')}</p>
        )}
      </section>

      {/* Native Features (rendered only when running in Capacitor APK) */}
      {isNative() && (
        <>
          {/* Phase N2: Nearby Sync Section */}
          <section className="rounded-2xl border border-accent/30 bg-accent/5 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              {t('nearbySyncTitle')}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{t('nearbySyncHint')}</p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const { NearbySyncPlugin } = await import('../lib/nearbySync');
                    await NearbySyncPlugin.start({ endpointName: author ? author.slice(0, 10) : 'Setu Device' });
                    setFileMsg({ tone: 'ok', text: t('nearbySyncSearching') });
                  } catch {
                    setFileMsg({ tone: 'err', text: 'Nearby Sync failed to start' });
                  }
                }}
                className="min-h-12 flex-1 rounded-xl bg-accent py-3 text-sm font-semibold text-white active:opacity-90"
              >
                {t('nearbySyncConnect')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const { NearbySyncPlugin } = await import('../lib/nearbySync');
                    await NearbySyncPlugin.stop();
                    setFileMsg(null);
                  } catch {
                    /* ignore */
                  }
                }}
                className="min-h-12 rounded-xl border border-line bg-surface py-3 px-4 text-sm font-semibold text-ink active:opacity-80"
              >
                {t('close')}
              </button>
            </div>
          </section>

          {/* Phase N9: Hub Mode Section */}
          <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t('hubModeTitle')}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{t('hubModeHint')}</p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const { HubModePlugin } = await import('../lib/hubMode');
                    const bundleBytes = await encodeBundle(filterForBundle(events, 'all', myGh));
                    let binary = '';
                    for (let i = 0; i < bundleBytes.length; i++) {
                      binary += String.fromCharCode(bundleBytes[i]);
                    }
                    await HubModePlugin.updateHubBundle({ base64: btoa(binary) });
                    const res = await HubModePlugin.startHub();
                    setFileMsg({ tone: 'ok', text: `Hub Active: ${res.url} (SSID: ${res.ssid})` });
                  } catch {
                    setFileMsg({ tone: 'err', text: 'Hub Mode failed' });
                  }
                }}
                className="min-h-12 flex-1 rounded-xl bg-accent py-3 text-sm font-semibold text-white active:opacity-90"
              >
                Start Local Hub
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const { HubModePlugin } = await import('../lib/hubMode');
                    await HubModePlugin.stopHub();
                    setFileMsg(null);
                  } catch {
                    /* ignore */
                  }
                }}
                className="min-h-12 rounded-xl border border-line bg-surface-2 py-3 px-4 text-sm font-semibold text-ink"
              >
                Stop Hub
              </button>
            </div>
          </section>

          {/* Phase N3: Courier Mode Section */}
          <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t('courierModeTitle')}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{t('courierModeHint')}</p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const { CourierPlugin } = await import('../lib/courier');
                    await CourierPlugin.startCourier();
                    setFileMsg({ tone: 'ok', text: 'Courier Mode active in background' });
                  } catch {
                    setFileMsg({ tone: 'err', text: 'Courier Mode failed' });
                  }
                }}
                className="min-h-12 flex-1 rounded-xl bg-surface-2 border border-line py-3 text-sm font-semibold text-ink"
              >
                Enable Courier Mode
              </button>
            </div>
          </section>

          {/* Phase N5: Backup Section */}
          <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t('backupStatusTitle')}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted">Automatic local database backups</span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const { performAutoBackup } = await import('../lib/backup');
                    const ts = await performAutoBackup();
                    if (ts) setFileMsg({ tone: 'ok', text: `Backup created at ${new Date(ts).toLocaleTimeString()}` });
                  } catch {
                    setFileMsg({ tone: 'err', text: 'Backup failed' });
                  }
                }}
                className="rounded-lg bg-surface-2 border px-3 py-1.5 text-xs font-semibold text-ink"
              >
                Backup Now
              </button>
            </div>
          </section>
        </>
      )}

      {/* Feature G: Direct WebRTC Sync Section */}
      <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          📡 {t('webrtcSyncTitle')}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t('webrtcSyncHint')}</p>

        {webrtcStep === 'offer' && webrtcQrUrl && (
          <div className="mt-3 flex flex-col items-center text-center gap-2">
            <img src={webrtcQrUrl} alt="Offer QR" className="h-44 w-44 rounded-xl border bg-white p-2" />
            <p className="text-xs font-medium text-ink">{t('webrtcShowOffer')}</p>
            <button
              type="button"
              onClick={() => setScanning(true)}
              className="mt-2 min-h-10 px-4 rounded-lg bg-accent text-xs font-semibold text-white"
            >
              {t('webrtcScanAnswer')}
            </button>
          </div>
        )}

        {webrtcStep === 'answer' && webrtcQrUrl && (
          <div className="mt-3 flex flex-col items-center text-center gap-2">
            <img src={webrtcQrUrl} alt="Answer QR" className="h-44 w-44 rounded-xl border bg-white p-2" />
            <p className="text-xs font-medium text-ink">{t('webrtcShowAnswer')}</p>
          </div>
        )}

        {webrtcStep === 'idle' && (
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={() => void startWebrtcOffer()}
              className="min-h-12 flex-1 rounded-xl bg-accent py-3 text-sm font-semibold text-white active:opacity-90"
            >
              {t('webrtcShowOffer')}
            </button>
            <button
              type="button"
              onClick={() => setScanning(true)}
              className="min-h-12 flex-1 rounded-xl border border-line bg-surface-2 py-3 text-sm font-semibold text-ink active:opacity-80"
            >
              {t('webrtcScanOffer')}
            </button>
          </div>
        )}
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
            onResult={async (text) => {
              setScanning(false);
              if (text.startsWith(WEBRTC_OFFER_PREFIX)) {
                try {
                  const rtc = new DirectWebRtcSync();
                  setWebrtcSync(rtc);
                  rtc.onReceiveBundle = async (res) => {
                    await refreshEvents();
                    void refreshStats();
                    setFileMsg({
                      tone: 'ok',
                      text: `WebRTC Sync — ${t('beamNew')}: ${toBnDigits(res.added)}, ${t('beamKnown')}: ${toBnDigits(res.known)}`,
                    });
                    setWebrtcStep('connected');
                  };
                  const answerPayload = await rtc.handleOfferAndCreateAnswer(text);
                  const dataUrl = await QRCode.toDataURL(answerPayload, { errorCorrectionLevel: 'L', width: 400 });
                  setWebrtcQrUrl(dataUrl);
                  setWebrtcStep('answer');
                  await rtc.sendBundle(filterForBundle(events, 'all', myGh));
                } catch {
                  setFileMsg({ tone: 'err', text: t('syncFileFailed') });
                }
              } else if (text.startsWith(WEBRTC_ANSWER_PREFIX)) {
                try {
                  if (webrtcSync) {
                    await webrtcSync.handleAnswer(text);
                    await webrtcSync.sendBundle(filterForBundle(events, 'all', myGh));
                    setWebrtcStep('connected');
                  }
                } catch {
                  setFileMsg({ tone: 'err', text: t('syncFileFailed') });
                }
              } else if (text.startsWith(POSTER_PREFIX)) {
                try {
                  const imported = await decodePosterPayload(text);
                  const res = await ingestEvents(imported);
                  await refreshEvents();
                  void refreshStats();
                  setFileMsg({
                    tone: 'ok',
                    text: `${t('posterTitle')} — ${t('beamNew')}: ${toBnDigits(res.added)}, ${t('beamKnown')}: ${toBnDigits(res.known)}`,
                  });
                } catch {
                  setFileMsg({ tone: 'err', text: t('syncFileFailed') });
                }
              } else {
                setNodeInput(text);
                submitNode(text);
              }
            }}
          />
        )}
      </Suspense>
    </div>
  );
}
