import {
  eventView,
  threadFor,
  type SetuAttachment,
  type SetuEvent,
} from '@setu/shared';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { areaLabel } from '../lib/area';
import { timeAgo } from '../lib/time';
import { useAppStore } from '../store/appStore';
import { useEventsStore } from '../store/eventsStore';
import { AttachmentComposer } from './AttachmentComposer';
import { BottomSheet } from './BottomSheet';
import { MediaAttachment } from './MediaAttachment';
import { TrustBadge } from './TrustBadge';

const nowSeconds = () => Math.floor(Date.now() / 1000);

export function EventDetailSheet({
  event,
  open,
  onClose,
}: {
  event: SetuEvent;
  open: boolean;
  onClose: () => void;
}) {
  const { t, lang, categoryIcon, categoryLabel } = useI18n();
  const events = useEventsStore((state) => state.events);
  const publish = useEventsStore((state) => state.publish);
  const identity = useAppStore((state) => state.identity);
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<SetuAttachment>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const thread = useMemo(() => threadFor(events, event.id), [events, event.id]);
  const meta = useMemo(() => eventView(events, event), [events, event]);
  const own = identity?.author === event.au;
  const myAck = thread.filter((child) => child.au === identity?.author && child.t === 'ack');
  const muted = settings?.mutedAuthors.includes(event.au) ?? false;
  const watched = settings?.watchedAuthors.some((item) => item.au === event.au) ?? false;
  const offers = useMemo(
    () =>
      event.t === 'help' && event.st === 'need'
        ? events.filter(
            (candidate) =>
              candidate.t === 'help' &&
              candidate.st === 'offer' &&
              candidate.cat === event.cat &&
              (!event.gh || candidate.gh.startsWith(event.gh.slice(0, 4))),
          )
        : [],
    [events, event],
  );

  async function sendReply(): Promise<void> {
    if ((!message.trim() && !attachment) || busy) return;
    setBusy(true);
    try {
      await publish({
        t: 'reply',
        ts: nowSeconds(),
        gh: event.gh,
        re: event.id,
        n: settings?.name.trim().slice(0, 32) || undefined,
        msg: message.trim().slice(0, 280) || (lang === 'bn' ? 'সংযুক্তি' : 'Attachment'),
        att: attachment,
      });
      setMessage('');
      setAttachment(undefined);
      setNotice(t('detailReplySent'));
    } finally {
      setBusy(false);
    }
  }

  async function acknowledge(kind: 'onit' | 'done' | 'seen'): Promise<void> {
    if (busy) return;
    if (kind === 'done' && !window.confirm(t('detailDoneConfirm'))) return;
    setBusy(true);
    try {
      await publish({
        t: 'ack',
        ts: nowSeconds(),
        gh: event.gh,
        re: event.id,
        ak: kind,
        n: settings?.name.trim().slice(0, 32) || undefined,
      });
      navigator.vibrate?.(30);
      setNotice(kind === 'done' ? t('detailResolved') : t('detailAckSent'));
    } finally {
      setBusy(false);
    }
  }

  async function retract(): Promise<void> {
    if (!own || !window.confirm(t('detailDeleteHonest'))) return;
    setBusy(true);
    try {
      await publish({ t: 'retract', ts: nowSeconds(), gh: event.gh, re: event.id });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function toggleMute(): Promise<void> {
    const current = settings?.mutedAuthors ?? [];
    await updateSettings({
      mutedAuthors: muted
        ? current.filter((author) => author !== event.au)
        : [...new Set([...current, event.au])],
    });
  }

  async function toggleWatch(): Promise<void> {
    const current = settings?.watchedAuthors ?? [];
    await updateSettings({
      watchedAuthors: watched
        ? current.filter((item) => item.au !== event.au)
        : [...current, { au: event.au, name: event.n ?? event.pn ?? t('unknownName') }],
    });
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={t('detailTitle')}>
      <article>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-ink">{event.n ?? event.pn ?? t('unknownName')}</p>
            <p className="text-sm text-muted">
              {areaLabel(event.gh, lang) || t('unknownArea')} · {timeAgo(event.ts, lang)}
            </p>
          </div>
          <TrustBadge event={event} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {event.cat && (
            <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
              {categoryIcon(event.cat)} {categoryLabel(event.cat)}
            </span>
          )}
          {meta.responders > 0 && (
            <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
              {meta.responders} {t('detailResponding')}
            </span>
          )}
          {meta.resolved && (
            <span className="rounded-full bg-safe/15 px-2.5 py-1 text-xs font-semibold text-safe">
              ✓ {t('detailResolved')}
            </span>
          )}
        </div>
        {event.msg && <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink">{event.msg}</p>}
        {event.att && <MediaAttachment att={event.att} />}
        {event.loc && (
          <Link to={`/map?event=${event.id}`} className="mt-3 inline-flex rounded-lg bg-surface-2 px-3 py-2 text-sm font-semibold text-accent">
            📍 {t('detailViewMap')}
          </Link>
        )}

        {event.t === 'help' && event.st === 'need' && !meta.resolved && (
          <div className="mt-5 grid grid-cols-2 gap-2">
            {!own && (
              <button
                type="button"
                disabled={busy || myAck.some((ack) => ack.ak === 'onit')}
                onClick={() => void acknowledge('onit')}
                className="min-h-12 rounded-xl bg-accent px-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {t('detailOnIt')}
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void acknowledge('done')}
              className="min-h-12 rounded-xl bg-safe px-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {own ? t('detailReceivedHelp') : t('detailMarkDone')}
            </button>
          </div>
        )}
        {event.t === 'person' && event.pst === 'missing' && (
          <button
            type="button"
            disabled={busy || myAck.some((ack) => ack.ak === 'seen')}
            onClick={() => void acknowledge('seen')}
            className="mt-4 min-h-12 w-full rounded-xl bg-safe px-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t('detailSeen')}
          </button>
        )}
        {offers.length > 0 && (
          <p className="mt-3 rounded-xl bg-safe/10 px-3 py-2 text-sm font-medium text-safe">
            {offers.length} {t('detailMatchingOffers')}
          </p>
        )}

        <div className="mt-5 flex gap-2 border-y border-line py-3">
          {!own && (
            <>
              <button type="button" onClick={() => void toggleWatch()} className="flex-1 rounded-lg bg-surface-2 px-2 py-2 text-xs font-semibold text-ink">
                {watched ? '★' : '☆'} {watched ? t('detailWatching') : t('detailWatch')}
              </button>
              <button type="button" onClick={() => void toggleMute()} className="flex-1 rounded-lg bg-surface-2 px-2 py-2 text-xs font-semibold text-ink">
                {muted ? t('detailUnmute') : t('detailMute')}
              </button>
            </>
          )}
          {own && (
            <button type="button" disabled={busy} onClick={() => void retract()} className="flex-1 rounded-lg bg-need/10 px-2 py-2 text-xs font-semibold text-need">
              🗑 {t('detailDelete')}
            </button>
          )}
        </div>

        <section className="mt-5">
          <h3 className="text-sm font-bold text-ink">{t('detailConversation')}</h3>
          <div className="mt-3 flex flex-col gap-2">
            {thread.length === 0 && <p className="text-sm text-muted">{t('detailNoReplies')}</p>}
            {thread.map((child) => (
              <div key={child.id} className={`rounded-xl p-3 ${child.t === 'ack' ? 'bg-accent/8' : 'bg-surface-2'}`}>
                <div className="flex justify-between gap-3 text-xs text-muted">
                  <span className="font-semibold text-ink">{child.n ?? t('unknownName')}</span>
                  <span>{timeAgo(child.ts, lang)}</span>
                </div>
                {child.t === 'ack' ? (
                  <p className="mt-1 text-sm font-semibold text-accent">
                    {child.ak === 'onit' ? t('detailOnIt') : child.ak === 'done' ? `✓ ${t('detailResolved')}` : t('detailSeen')}
                  </p>
                ) : (
                  child.msg && <p className="mt-1 text-sm text-ink">{child.msg}</p>
                )}
                {child.att && <MediaAttachment att={child.att} />}
              </div>
            ))}
          </div>
        </section>

        {!muted && (
          <div className="mt-5 flex flex-col gap-2">
            <textarea
              value={message}
              maxLength={280}
              rows={2}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={t('detailReplyPlaceholder')}
              className="w-full resize-none rounded-xl border border-line bg-surface px-3 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <AttachmentComposer value={attachment} onChange={setAttachment} />
            <button
              type="button"
              disabled={busy || (!message.trim() && !attachment)}
              onClick={() => void sendReply()}
              className="min-h-12 rounded-xl bg-accent px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              {t('detailSendReply')}
            </button>
          </div>
        )}
        {notice && <p role="status" className="mt-3 text-center text-sm font-medium text-safe">{notice}</p>}
      </article>
    </BottomSheet>
  );
}
