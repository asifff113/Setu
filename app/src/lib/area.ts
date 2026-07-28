import { findAreaByGh } from '@setu/shared';
import type { Lang } from '../i18n';

/** Best-effort area label for an event's geohash prefix: exact area match, else the raw hash, else '' for the caller to fall back on. */
export function areaLabel(gh: string, lang: Lang): string {
  if (!gh) return '';
  const area = findAreaByGh(gh);
  if (area) return lang === 'bn' ? area.bn : area.name;
  return gh;
}
