import { create } from 'zustand';
import {
  createGuestIdentity,
  getActiveIdentity,
  switchToPrimaryIdentity,
} from '../db/identity';
import {
  readSettings,
  writeSettings,
  type SettingsPatch,
} from '../db/settings';
import type { GuestIdentityRow, IdentityRow, Language, SettingsRow } from '../db/schema';

interface AppState {
  /** true once identity + settings have been loaded from IndexedDB */
  ready: boolean;
  identity: IdentityRow | GuestIdentityRow | null;
  isGuest: boolean;
  settings: SettingsRow | null;

  /** Load (or create) identity + settings. Idempotent and race-safe. */
  hydrate: () => Promise<void>;
  /** Merge + persist a settings patch. */
  updateSettings: (patch: SettingsPatch) => Promise<void>;
  /** Convenience toggle for the EN/বাং switch. */
  setLanguage: (lang: Language) => Promise<void>;
  /** Enable guest identity mode for a borrower. */
  enableGuestMode: (guestName: string) => Promise<void>;
  /** Switch back to primary device identity. */
  exitGuestMode: () => Promise<void>;
}

// Shared across every subscriber so concurrent hydrate() calls (e.g. StrictMode)
// resolve to one load.
let hydration: Promise<void> | null = null;

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  identity: null,
  isGuest: false,
  settings: null,

  hydrate: () => {
    if (get().ready) return Promise.resolve();
    if (!hydration) {
      hydration = (async () => {
        const [{ row, isGuest }, settings] = await Promise.all([
          getActiveIdentity(),
          readSettings(),
        ]);
        set({ identity: row, isGuest, settings, ready: true });
        if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
          void navigator.storage.persist().catch(() => {});
        }
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

  enableGuestMode: async (guestName) => {
    const guestRow = await createGuestIdentity(guestName);
    set({ identity: guestRow, isGuest: true });
  },

  exitGuestMode: async () => {
    const primary = await switchToPrimaryIdentity();
    set({ identity: primary, isGuest: false });
  },
}));
