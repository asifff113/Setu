import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ingestEvents } from '../db/events';
import { useI18n } from '../i18n';
import { decodeLinkBeamPayload } from '../lib/linkBeam';
import { useEventsStore } from '../store/eventsStore';
import { useSyncStore } from '../store/syncStore';
import type { SetuEvent } from '@setu/shared';

export function LinkBeamScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const refreshEvents = useEventsStore((s) => s.refresh);
  const refreshStats = useSyncStore((s) => s.refreshStats);

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<SetuEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      try {
        const decoded = decodeLinkBeamPayload(window.location.hash || window.location.href);
        const res = await ingestEvents([decoded]);
        if (res.added > 0 || res.known > 0) {
          await refreshEvents();
          void refreshStats();
          setEvent(decoded);
        } else {
          setError(t('linkBeamError'));
        }
      } catch {
        setError(t('linkBeamError'));
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, [refreshEvents, refreshStats, t]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center p-6 text-center">
      {loading ? (
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl animate-spin">🔗</span>
          <p className="text-sm font-semibold text-muted">{t('linkBeamIngesting')}</p>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-need/30 bg-need/10 p-6 flex flex-col items-center gap-4">
          <span className="text-5xl">⚠️</span>
          <h1 className="text-xl font-bold text-need">{error}</h1>
          <button
            type="button"
            onClick={() => navigate('/board')}
            className="min-h-12 w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white"
          >
            {t('tabBoard')}
          </button>
        </div>
      ) : (
        <div className="rounded-3xl border border-safe/30 bg-safe/10 p-6 flex flex-col items-center gap-4 w-full">
          <span className="text-5xl">✅</span>
          <h1 className="text-xl font-bold text-safe">{t('linkBeamSuccess')}</h1>
          {event && (
            <div className="w-full rounded-2xl bg-surface p-4 border border-line text-left text-xs text-ink space-y-1">
              <p className="font-bold text-sm">{event.n || t('unknownName')}</p>
              <p className="text-muted">{event.st === 'safe' ? t('statusSafe') : t('statusNeed')}</p>
              {event.msg && <p className="italic text-muted">"{event.msg}"</p>}
            </div>
          )}
          <button
            type="button"
            onClick={() => navigate('/board')}
            className="min-h-12 w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white"
          >
            {t('tabBoard')}
          </button>
        </div>
      )}
    </div>
  );
}
