import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';

/**
 * Browser online/offline as a first pass. Offline is styled as a routine
 * state, not an error — the Sync screen (Phase 4-5) will upgrade this same
 * 🟢/🟡/🔴 language to real relay/local-node connection state.
 */
export function ConnectivityPill() {
  const { t } = useI18n();
  const [online, setOnline] = useState(
    () => typeof navigator === 'undefined' || navigator.onLine,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-xs text-white/70">
      <span>{online ? '🟢' : '🔴'}</span>
      <span>{online ? t('connOnline') : t('connOffline')}</span>
    </div>
  );
}
