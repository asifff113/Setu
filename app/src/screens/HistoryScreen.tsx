import { eventView, isExpired, type SetuEvent } from '@setu/shared';
import { useEffect, useMemo, useState } from 'react';
import { EventDetailSheet } from '../components/EventDetailSheet';
import { db } from '../db/schema';
import { useI18n } from '../i18n';
import { timeAgo } from '../lib/time';
import { useAppStore } from '../store/appStore';
import { useEventsStore } from '../store/eventsStore';

export function HistoryScreen() {
  const { t, lang } = useI18n();
  const identity = useAppStore((state) => state.identity);
  const live = useEventsStore((state) => state.events);
  const publish = useEventsStore((state) => state.publish);
  const [all, setAll] = useState<SetuEvent[]>([]);
  const [selected, setSelected] = useState<SetuEvent | null>(null);

  useEffect(() => {
    void db.events.where('au').equals(identity?.author ?? '').reverse().sortBy('ts').then(setAll);
  }, [identity?.author, live]);

  const authored = useMemo(
    () => all.filter((event) => !['reply', 'ack', 'retract', 'chat'].includes(event.t)).sort((a, b) => b.ts - a.ts),
    [all],
  );

  async function republish(event: SetuEvent): Promise<void> {
    const { t, gh, n, st, cat, msg, loc, pn, pst, att, urg, sev } = event;
    await publish({
      t,
      ts: Math.floor(Date.now() / 1000),
      gh,
      n,
      st,
      cat,
      msg,
      loc,
      pn,
      pst,
      att,
      urg,
      sev,
    });
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 px-4 py-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">{t('historyTitle')}</h1>
        <p className="mt-1 text-sm text-muted">{t('historyHint')}</p>
      </div>
      {authored.length === 0 && (
        <p className="rounded-2xl border border-line bg-surface px-4 py-10 text-center text-sm text-muted">
          {t('historyEmpty')}
        </p>
      )}
      {authored.map((event) => {
        const view = eventView(all, event);
        const expired = isExpired(event, Math.floor(Date.now() / 1000));
        const retracted = view.retracted;
        const status = retracted
          ? t('historyRetracted')
          : expired
            ? t('historyExpired')
            : view.resolved
              ? t('detailResolved')
              : t('historyActive');
        return (
          <article key={event.id} className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
            <button type="button" onClick={() => setSelected(event)} className="w-full text-left">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-ink">{event.msg ?? event.pn ?? event.n ?? event.t}</p>
                <span className="shrink-0 rounded-full bg-surface-2 px-2 py-1 text-xs text-muted">{status}</span>
              </div>
              <p className="mt-2 text-xs text-muted">{timeAgo(event.ts, lang)} · {event.t}</p>
            </button>
            {(expired || view.resolved) && !retracted && event.t !== 'checkin' && (
              <button
                type="button"
                onClick={() => void republish(event)}
                className="mt-3 min-h-10 rounded-xl bg-accent/10 px-3 text-xs font-semibold text-accent"
              >
                {t('historyRepublish')}
              </button>
            )}
          </article>
        );
      })}
      {selected && <EventDetailSheet event={selected} open onClose={() => setSelected(null)} />}
    </div>
  );
}
