import { db, type SettingsRow } from './schema';

const DEFAULT_SETTINGS: Omit<SettingsRow, 'updatedAt'> = {
  key: 'settings',
  name: '',
  areaCode: null,
  gh: '',
  lang: 'bn', // Bangla-first
  onboarded: false,
};

/** Read settings, returning sane defaults when nothing is stored yet. */
export async function readSettings(): Promise<SettingsRow> {
  const existing = await db.meta.get('settings');
  if (existing && existing.key === 'settings') return existing;
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
