import { db, type SettingsRow } from './schema';

const DEFAULT_SETTINGS: Omit<SettingsRow, 'updatedAt'> = {
  key: 'settings',
  name: '',
  areaCode: null,
  gh: '',
  locality: '',
  lang: 'bn', // Bangla-first
  onboarded: false,
  hintsSeen: [],
  mutedAuthors: [],
  watchedAuthors: [],
  autoDownloadMedia: false,
  responderMode: false,
  theme: 'system',
  batterySaver: false,
  largeText: false,
  lastSeen: {},
};

/** Read settings, returning sane defaults when nothing is stored yet. */
export async function readSettings(): Promise<SettingsRow> {
  const existing = await db.meta.get('settings');
  if (existing && existing.key === 'settings') {
    // Rows created before the profile editor have no `locality` field.
    return {
      ...DEFAULT_SETTINGS,
      ...existing,
      locality: existing.locality ?? '',
      hintsSeen: existing.hintsSeen ?? [],
      mutedAuthors: existing.mutedAuthors ?? [],
      watchedAuthors: existing.watchedAuthors ?? [],
      lastSeen: existing.lastSeen ?? {},
    };
  }
  return { ...DEFAULT_SETTINGS, updatedAt: 0 };
}

/** Fields a caller may change; `key`/`updatedAt` are managed here. */
export type SettingsPatch = Partial<Omit<SettingsRow, 'key' | 'updatedAt'>>;

/** Merge a patch into settings and persist, returning the new row. */
export async function writeSettings(patch: SettingsPatch): Promise<SettingsRow> {
  const current = await readSettings();
  const next: SettingsRow = {
    ...current,
    ...patch,
    key: 'settings',
    updatedAt: Math.floor(Date.now() / 1000),
  };
  await db.meta.put(next);
  return next;
}
