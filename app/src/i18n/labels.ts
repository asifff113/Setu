import type { SetuCategory, SetuPersonStatus, SetuStatus } from '@setu/shared';
import type { Entry } from './dict';

export const CATEGORY_LABELS: Record<SetuCategory, Entry> = {
  med: { bn: 'মেডিকেল', en: 'Medical' },
  rescue: { bn: 'উদ্ধার', en: 'Rescue' },
  food: { bn: 'খাবার', en: 'Food' },
  water: { bn: 'পানি', en: 'Water' },
  shelter: { bn: 'আশ্রয়', en: 'Shelter' },
  other: { bn: 'অন্যান্য', en: 'Other' },
};

export const CATEGORY_ICONS: Record<SetuCategory, string> = {
  med: '💊',
  rescue: '🚨',
  food: '🍚',
  water: '💧',
  shelter: '🏠',
  other: '❓',
};

export const PERSON_STATUS_LABELS: Record<SetuPersonStatus, Entry> = {
  missing: { bn: 'নিখোঁজ', en: 'Missing' },
  found: { bn: 'পাওয়া গেছে', en: 'Found' },
  seen: { bn: 'দেখা গেছে', en: 'Seen' },
};

export const STATUS_LABELS: Record<SetuStatus, Entry> = {
  safe: { bn: 'নিরাপদ', en: 'Safe' },
  need: { bn: 'সাহায্য দরকার', en: 'Needs help' },
};
