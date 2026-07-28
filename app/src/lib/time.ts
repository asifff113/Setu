import type { Lang } from '../i18n';

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/** Render an integer with Bangla numerals for bn UI. */
export function toBnDigits(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]!);
}

function localizeNumber(n: number, lang: Lang): string {
  return lang === 'bn' ? toBnDigits(n) : String(n);
}

/**
 * Human "N ago" string. Negative device-clock skew (event ts slightly ahead
 * of local time) floors to "just now" rather than showing a negative age.
 */
export function timeAgo(
  ts: number,
  lang: Lang,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): string {
  const diff = Math.max(0, nowSeconds - ts);
  if (diff < 60) return lang === 'bn' ? 'এইমাত্র' : 'just now';

  const mins = Math.floor(diff / 60);
  if (mins < 60) {
    return lang === 'bn' ? `${localizeNumber(mins, lang)} মিনিট আগে` : `${mins}m ago`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return lang === 'bn' ? `${localizeNumber(hours, lang)} ঘণ্টা আগে` : `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return lang === 'bn' ? `${localizeNumber(days, lang)} দিন আগে` : `${days}d ago`;
}
