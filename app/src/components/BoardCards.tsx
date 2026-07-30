import type { SetuEventView } from '@setu/shared';
import { useI18n } from '../i18n';
import { areaLabel } from '../lib/area';
import { timeAgo } from '../lib/time';
import { TrustBadge } from './TrustBadge';
import { MediaAttachment } from './MediaAttachment';

/** People/Help tab card: a person's latest checkin/help. */
export function PersonStatusCard({ event, onOpen }: { event: SetuEventView; onOpen?: () => void }) {
  const { t, lang, categoryIcon, categoryLabel, statusLabel } = useI18n();
  const safe = event.st === 'safe' || event.st === 'offer';
  const waitingHours = Math.floor((Date.now() / 1000 - event.ts) / 3600);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onOpen?.();
      }}
      className={`rounded-2xl border border-line bg-surface p-4 shadow-sm ${
        safe ? 'border-l-4 border-l-safe' : 'border-l-4 border-l-need'
      } w-full text-left active:opacity-90`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{event.n || t('unknownName')}</p>
          <p className="text-xs text-muted">{areaLabel(event.gh, lang) || t('unknownArea')}</p>
        </div>
        <TrustBadge event={event} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            safe ? 'bg-safe/20 text-safe' : 'bg-need/20 text-need'
          }`}
        >
              <span className={event.resolved ? 'line-through opacity-70' : ''}>{event.st ? statusLabel(event.st) : ''}</span>
        </span>
        {event.cat && (
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
            {categoryIcon(event.cat)} {categoryLabel(event.cat)}
          </span>
        )}
        {event.responders > 0 && (
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
            {event.responders} responding
          </span>
        )}
        {event.replies > 0 && <span className="text-xs text-muted">💬 {event.replies}</span>}
        {event.resolved && (
          <span className="rounded-full bg-safe/15 px-2 py-0.5 text-xs font-semibold text-safe">✓ Resolved</span>
        )}
        {!event.resolved && event.st === 'need' && waitingHours >= 12 && (
          <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">
            ⏰ {waitingHours}h
          </span>
        )}
        <span className="ml-auto whitespace-nowrap text-xs text-muted">{timeAgo(event.ts, lang)}</span>
      </div>
      {event.msg && <p className="mt-2 text-sm leading-relaxed text-ink/80">{event.msg}</p>}
      {event.att && <MediaAttachment att={event.att} />}
    </div>
  );
}

/** Missing tab card: a person's latest missing/found/seen report. */
export function MissingCard({ event, onOpen }: { event: SetuEventView; onOpen?: () => void }) {
  const { t, lang, personStatusLabel } = useI18n();
  const positive = event.pst === 'found' || event.pst === 'seen';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onOpen?.();
      }}
      className={`rounded-2xl border border-line bg-surface p-4 shadow-sm ${
        positive ? 'border-l-4 border-l-safe' : 'border-l-4 border-l-need'
      } w-full text-left active:opacity-90`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{event.pn || t('unknownName')}</p>
          <p className="text-xs text-muted">{areaLabel(event.gh, lang) || t('unknownArea')}</p>
        </div>
        <TrustBadge event={event} />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            positive ? 'bg-safe/20 text-safe' : 'bg-need/20 text-need'
          }`}
        >
          {event.pst ? personStatusLabel(event.pst) : ''}
        </span>
        <span className="ml-auto whitespace-nowrap text-xs text-muted">{timeAgo(event.ts, lang)}</span>
        {event.replies > 0 && <span className="text-xs text-muted">💬 {event.replies}</span>}
      </div>
      {event.msg && <p className="mt-2 text-sm leading-relaxed text-ink/80">{event.msg}</p>}
      {event.att && <MediaAttachment att={event.att} />}
    </div>
  );
}

/** Bulletins tab card: an independent, ungrouped bulletin. */
export function BulletinCard({ event, onOpen }: { event: SetuEventView; onOpen?: () => void }) {
  const { lang } = useI18n();
  const area = areaLabel(event.gh, lang);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onOpen?.();
      }}
      className={`w-full rounded-2xl border bg-surface p-4 text-left shadow-sm active:opacity-90 ${
        event.sev === 'danger' ? 'border-need' : event.sev === 'warning' ? 'border-warning' : 'border-accent/20'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {area && <p className="text-xs text-muted">{area}</p>}
        <TrustBadge event={event} />
      </div>
      {event.msg && <p className="mt-2 text-sm leading-relaxed text-ink">{event.msg}</p>}
      <p className="mt-2 whitespace-nowrap text-xs text-muted">{timeAgo(event.ts, lang)}</p>
      {event.att && <MediaAttachment att={event.att} />}
    </div>
  );
}
