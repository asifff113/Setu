import { useI18n, type DictKey } from '../i18n';
import { useSyncStore, type SyncStatus } from '../store/syncStore';

/**
 * The 🟢 relay / 🟡 local node / 🔴 offline pill, driven by the real relay
 * connection state (syncStore). Offline is styled as a routine state, not an
 * error — the whole point of Setu is that it keeps working with no network.
 */
const PILL: Record<SyncStatus, { icon: string; key: DictKey }> = {
  relay: { icon: '🟢', key: 'connRelay' },
  node: { icon: '🟡', key: 'connNode' },
  connecting: { icon: '🟡', key: 'connConnecting' },
  offline: { icon: '🔴', key: 'connOffline' },
};

export function ConnectivityPill() {
  const { t } = useI18n();
  const status = useSyncStore((s) => s.status);
  const pill = PILL[status];

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-xs text-white/70">
      <span aria-hidden="true">{pill.icon}</span>
      <span>{t(pill.key)}</span>
    </div>
  );
}
