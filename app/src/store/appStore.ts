import { create } from 'zustand';
import { loadOrCreateIdentity } from '../db/identity';
import {
  readSettings,
  writeSettings,
  type SettingsPatch,
} from '../db/settings';
import type { IdentityRow, Language, SettingsRow } from '../db/schema';

interface AppState {
  /** true once identity + settings have been loaded from IndexedDB */
  ready: boolean;
  identity: IdentityRow | null;
  settings: SettingsRow | null;

  /** Load (or create) identity + settings. Idempotent and race-safe. */
  hydrate: () => Promise<void>;
  /** Merge + persist a settings patch. */
  updateSettings: (patch: SettingsPatch) => Promise<void>;
  /** Convenience toggle for the EN/বাং switch. */
  setLanguage: (lang: Language) => Promise<void>;
}

// Shared across every subscriber so concurrent hydrate() calls (e.g. StrictMode)
// resolve to one load.
let hydration: Promise<void> | null = null;

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  identity: null,
  settings: null,

  hydrate: () => {
    if (get().ready) return Promise.resolve();
    if (!hydration) {
      hydration = (async () => {
        const [identity, settings] = await Promise.all([
          loadOrCreateIdentity(),
          readSettings(),
        ]);
        set({ identity, settings, ready: true });
      })();
    }
    return hydration;
  },

  updateSettings: async (patch) => {
    const settings = await writeSettings(patch);
    set({ settings });
  },

  setLanguage: async (lang) => {
    const settings = await writeSettings({ lang });
    set({ settings });
  },
}));
