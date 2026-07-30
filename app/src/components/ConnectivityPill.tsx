import { useI18n, type DictKey } from '../i18n';
import { useSyncStore, type SyncStatus } from '../store/syncStore';

const PILL: Record<SyncStatus, { key: DictKey; dot: string; tone: string }> = {
  relay: { key: 'connRelay', dot: 'bg-safe', tone: 'text-safe' },
  node: { key: 'connNode', dot: 'bg-warning', tone: 'text-warning' },
  connecting: { key: 'connConnecting', dot: 'bg-warning', tone: 'text-warning' },
  offline: { key: 'connOffline', dot: 'bg-muted', tone: 'text-muted' },
};

export function ConnectivityPill() {
  const { t } = useI18n();
  const status = useSyncStore((s) => s.status);
  const pill = PILL[status];

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium shadow-sm">
      <span className={`h-2.5 w-2.5 rounded-full ${pill.dot}`} aria-hidden="true" />
      <span className={pill.tone}>{t(pill.key)}</span>
    </div>
  );
}
