import { chatEvents, type SetuAttachment } from '@setu/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AttachmentComposer } from '../components/AttachmentComposer';
import { MediaAttachment } from '../components/MediaAttachment';
import { useI18n } from '../i18n';
import { areaLabel } from '../lib/area';
import { timeAgo } from '../lib/time';
import { useAppStore } from '../store/appStore';
import { useEventsStore } from '../store/eventsStore';

export function ChatScreen() {
  const { t, lang } = useI18n();
  const events = useEventsStore((state) => state.events);
  const publish = useEventsStore((state) => state.publish);
  const identity = useAppStore((state) => state.identity);
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<SetuAttachment>();
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => {
    const muted = new Set(settings?.mutedAuthors ?? []);
    return chatEvents(events, settings?.gh).filter((event) => !muted.has(event.au)).slice(-200);
  }, [events, settings]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
    void updateSettings({
      lastSeen: { ...(settings?.lastSeen ?? {}), chat: Math.floor(Date.now() / 1000) },
    });
    // Only message-count changes should mark the channel read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  async function send(): Promise<void> {
    if ((!message.trim() && !attachment) || !settings?.gh || busy) return;
    setBusy(true);
    try {
      await publish({
        t: 'chat',
        ts: Math.floor(Date.now() / 1000),
        gh: settings.gh,
        n: settings.name.trim().slice(0, 32) || undefined,
        msg: message.trim().slice(0, 280) || (lang === 'bn' ? 'সংযুক্তি' : 'Attachment'),
        att: attachment,
      });
      setMessage('');
      setAttachment(undefined);
    } finally {
      setBusy(false);
    }
  }

  if (!settings?.gh) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <span className="text-5xl" aria-hidden="true">💬</span>
        <h1 className="mt-4 text-xl font-bold text-ink">{t('chatNeedsArea')}</h1>
        <p className="mt-2 text-sm text-muted">{t('chatNeedsAreaHint')}</p>
        <Link to="/more" className="mt-5 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white">
          {t('chatSetArea')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur">
        <h1 className="font-bold text-ink">💬 {areaLabel(settings.gh, lang)}</h1>
        <p className="mt-0.5 text-xs text-muted">{t('chatExpiry')}</p>
      </header>
      <div className="flex flex-1 flex-col gap-2 px-4 py-4">
        {messages.length === 0 && (
          <div className="my-auto rounded-2xl border border-line bg-surface px-5 py-10 text-center">
            <span className="text-4xl" aria-hidden="true">🗣️</span>
            <p className="mt-3 text-sm font-semibold text-ink">{t('chatEmpty')}</p>
            <p className="mt-1 text-xs text-muted">{t('chatEmptyHint')}</p>
          </div>
        )}
        {messages.map((event, index) => {
          const previous = messages[index - 1];
          const newDay = !previous ||
            new Date(previous.ts * 1000).toDateString() !== new Date(event.ts * 1000).toDateString();
          const own = event.au === identity?.author;
          return (
            <div key={event.id}>
              {newDay && (
                <p className="my-3 text-center text-xs font-semibold text-muted">
                  {new Date(event.ts * 1000).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-BD')}
                </p>
              )}
              <div className={`max-w-[88%] rounded-2xl px-3 py-2.5 ${own ? 'ml-auto bg-accent text-white' : 'bg-surface shadow-sm'}`}>
                {!own && <p className="text-xs font-bold text-accent">{event.n ?? t('unknownName')}</p>}
                <p className="mt-0.5 whitespace-pre-wrap text-sm">{event.msg}</p>
                {event.att && <MediaAttachment att={event.att} />}
                <p className={`mt-1 text-right text-[10px] ${own ? 'text-white/70' : 'text-muted'}`}>
                  {timeAgo(event.ts, lang)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="sticky bottom-20 border-t border-line bg-surface p-3">
        <textarea
          rows={2}
          maxLength={280}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={t('chatPlaceholder')}
          className="w-full resize-none rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <div className="mt-2">
          <AttachmentComposer value={attachment} onChange={setAttachment} />
        </div>
        <button
          type="button"
          disabled={busy || (!message.trim() && !attachment)}
          onClick={() => void send()}
          className="mt-2 min-h-11 w-full rounded-xl bg-accent text-sm font-semibold text-white disabled:opacity-40"
        >
          {t('send')}
        </button>
      </div>
    </div>
  );
}
