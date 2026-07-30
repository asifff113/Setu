import { useState } from 'react';
import { useI18n, type DictKey } from '../i18n';
import { useSyncStore, type SyncStatus } from '../store/syncStore';
import { BottomSheet } from './BottomSheet';

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
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium shadow-sm">
        <span className={`h-2.5 w-2.5 rounded-full ${pill.dot}`} aria-hidden="true" />
        <span className={pill.tone}>{t(pill.key)}</span>
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={t('connectionExplainedTitle')}>
        <p className="text-sm leading-relaxed text-ink">
          {status === 'relay'
            ? t('connectionRelayPlain')
            : status === 'node'
              ? t('connectionNodePlain')
              : status === 'connecting'
                ? t('connectionConnectingPlain')
                : t('connectionOfflinePlain')}
        </p>
        <a href="/connect" className="mt-4 block rounded-xl bg-accent px-4 py-3 text-center text-sm font-semibold text-white">
          {t('connectionOpen')}
        </a>
      </BottomSheet>
    </>
  );
}
