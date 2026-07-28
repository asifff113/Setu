import { bulletinTrust, type SetuEvent } from '@setu/shared';
import { useI18n } from '../i18n';

/**
 * ✓ verified (pinned publisher, bulletins only) / ⚠ unverified (signed but
 * not pinned) / 📟 via SMS (relay-attested, not author-signed) / ✓ signed
 * (ordinary app-authored event — ingest already dropped anything that
 * doesn't verify, so reaching the store at all means the signature is good).
 */
export function TrustBadge({ event }: { event: SetuEvent }) {
  const { t } = useI18n();

  if (event.t === 'bulletin') {
    const trust = bulletinTrust(event);
    if (trust === 'invalid') return null;
    return trust === 'verified' ? (
      <span title={t('badgeVerified')} className="text-safe">
        ✓
      </span>
    ) : (
      <span title={t('badgeUnverified')} className="text-yellow-400">
        ⚠
      </span>
    );
  }

  if (event.src === 'sms') {
    return <span title={t('badgeSms')}>📟</span>;
  }

  return (
    <span title={t('badgeSigned')} className="text-safe">
      ✓
    </span>
  );
}
