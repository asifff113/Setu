import type { SetuEvent } from '@setu/shared';
import { useI18n } from '../i18n';
import { areaLabel } from '../lib/area';
import { timeAgo } from '../lib/time';
import { TrustBadge } from './TrustBadge';

/** People/Help tab card: a person's latest checkin/help. */
export function PersonStatusCard({ event }: { event: SetuEvent }) {
  const { t, lang, categoryIcon, categoryLabel, statusLabel } = useI18n();
  const safe = event.st === 'safe';

  return (
    <div
      className={`rounded-2xl border border-line bg-surface p-4 shadow-sm ${
        safe ? 'border-l-4 border-l-safe' : 'border-l-4 border-l-need'
      }`}
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
          {event.st ? statusLabel(event.st) : ''}
        </span>
        {event.cat && (
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
            {categoryIcon(event.cat)} {categoryLabel(event.cat)}
          </span>
        )}
        <span className="ml-auto whitespace-nowrap text-xs text-muted">{timeAgo(event.ts, lang)}</span>
      </div>
      {event.msg && <p className="mt-2 text-sm leading-relaxed text-ink/80">{event.msg}</p>}
    </div>
  );
}

/** Missing tab card: a person's latest missing/found/seen report. */
export function MissingCard({ event }: { event: SetuEvent }) {
  const { t, lang, personStatusLabel } = useI18n();
  const positive = event.pst === 'found' || event.pst === 'seen';

  return (
    <div
      className={`rounded-2xl border border-line bg-surface p-4 shadow-sm ${
        positive ? 'border-l-4 border-l-safe' : 'border-l-4 border-l-need'
      }`}
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
      </div>
      {event.msg && <p className="mt-2 text-sm leading-relaxed text-ink/80">{event.msg}</p>}
    </div>
  );
}

/** Bulletins tab card: an independent, ungrouped bulletin. */
export function BulletinCard({ event }: { event: SetuEvent }) {
  const { lang } = useI18n();
  const area = areaLabel(event.gh, lang);

  return (
    <div className="rounded-2xl border border-accent/20 bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        {area && <p className="text-xs text-muted">{area}</p>}
        <TrustBadge event={event} />
      </div>
      {event.msg && <p className="mt-2 text-sm leading-relaxed text-ink">{event.msg}</p>}
      <p className="mt-2 whitespace-nowrap text-xs text-muted">{timeAgo(event.ts, lang)}</p>
    </div>
  );
}
