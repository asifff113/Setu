import { bulletinTrust, type SetuEvent } from '@setu/shared';
import { useI18n } from '../i18n';

export function TrustBadge({ event }: { event: SetuEvent }) {
  const { t } = useI18n();

  if (event.t === 'bulletin') {
    const trust = bulletinTrust(event);
    if (trust === 'invalid') return null;
    return trust === 'verified' ? (
      <span className="rounded-full bg-safe/10 px-2.5 py-1 text-xs font-semibold text-safe">
        {t('badgeVerified')}
      </span>
    ) : (
      <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
        {t('badgeUnverified')}
      </span>
    );
  }

  if (event.src === 'sms') {
    return (
      <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
        {t('badgeSms')}
      </span>
    );
  }

  return (
    <span className="rounded-full bg-safe/10 px-2.5 py-1 text-xs font-semibold text-safe">
      {t('badgeSigned')}
    </span>
  );
}
