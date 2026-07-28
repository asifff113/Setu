import type { SetuCategory, SetuPersonStatus, SetuStatus } from '@setu/shared';
import { useAppStore } from '../store/appStore';
import { dict, type DictKey } from './dict';

export type { DictKey } from './dict';
import { CATEGORY_ICONS, CATEGORY_LABELS, PERSON_STATUS_LABELS, STATUS_LABELS } from './labels';

export type Lang = 'bn' | 'en';

/** Current UI language; defaults to Bangla before settings finish loading. */
export function useLang(): Lang {
  return useAppStore((s) => s.settings?.lang ?? 'bn');
}

/**
 * Bangla-first i18n: one hook, plain object lookups, no framework.
 * `t('key')` for UI chrome; the *Label helpers cover the small enum fields
 * (category, person status, safe/need) that aren't free text.
 */
export function useI18n() {
  const lang = useLang();
  return {
    lang,
    t: (key: DictKey): string => dict[key][lang],
    categoryLabel: (cat: SetuCategory): string => CATEGORY_LABELS[cat][lang],
    categoryIcon: (cat: SetuCategory): string => CATEGORY_ICONS[cat],
    personStatusLabel: (pst: SetuPersonStatus): string => PERSON_STATUS_LABELS[pst][lang],
    statusLabel: (st: SetuStatus): string => STATUS_LABELS[st][lang],
  };
}
