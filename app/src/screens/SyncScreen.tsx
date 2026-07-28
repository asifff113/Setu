import { useEffect, useState } from 'react';
import { useI18n, type DictKey } from '../i18n';
import { toBnDigits } from '../lib/time';
import { timeAgo } from '../lib/time';
import { useSyncStore, type SyncStatus } from '../store/syncStore';
import { QrScanner } from '../sync/QrScanner';

const STATUS_META: Record<SyncStatus, { icon: string; key: DictKey; tint: string }> = {
  relay: { icon: '🟢', key: 'syncStatusRelay', tint: 'text-safe' },
  node: { icon: '🟡', key: 'syncStatusNode', tint: 'text-yellow-400' },
  connecting: { icon: '🟡', key: 'syncStatusConnecting', tint: 'text-yellow-400' },
  offline: { icon: '🔴', key: 'syncStatusOffline', tint: 'text-white/60' },
};

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

  const [nodeInput, setNodeInput] = useState('');
  const [nodeError, setNodeError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

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

  const meta = STATUS_META[status];

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-6 pb-8">
      <h1 className="px-1 text-2xl font-bold text-white">{t('syncTitle')}</h1>

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

      {/* Phase 5 transports — visible so the screen reads as intentional */}
      <section className="rounded-2xl border border-dashed border-white/10 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-white/30">
          {t('syncComingTitle')}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/40">
          <span className="rounded-lg bg-surface-2/60 px-3 py-2">🔦 {t('syncBeamSend')}</span>
          <span className="rounded-lg bg-surface-2/60 px-3 py-2">📷 {t('syncBeamScan')}</span>
          <span className="rounded-lg bg-surface-2/60 px-3 py-2">📄 {t('syncExport')}</span>
        </div>
      </section>

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
    </div>
  );
}
