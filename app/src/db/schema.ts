import Dexie, { type Table } from 'dexie';
import type { SetuEvent } from '@setu/shared';

export type Language = 'bn' | 'en';

/** Persisted device identity. The secret key never leaves IndexedDB. */
export interface IdentityRow {
  key: 'identity';
  secretKey: Uint8Array; // 32-byte Ed25519 seed
  publicKey: Uint8Array; // 32-byte Ed25519 public key
  author: string; // base64url(publicKey), used as SetuEvent.au
  createdAt: number; // unix seconds
}

/** Persisted user settings (name, area, language, onboarding state). */
export interface SettingsRow {
  key: 'settings';
  name: string;
  areaCode: string | null; // Area.code from shared/areas, or null
  gh: string; // geohash prefix for the chosen area, '' if unknown
  lang: Language;
  onboarded: boolean;
  updatedAt: number; // unix seconds
}

/** Singleton rows in the `meta` key-value table, discriminated by `key`. */
export type MetaRow = IdentityRow | SettingsRow;

/**
 * Setu's local database.
 *
 * `events` holds immutable signed SetuEvents keyed by content id; the compound
 * and single indexes back the Board/Map/area views. `meta` holds the two
 * device singletons (identity + settings).
 */
export class SetuDB extends Dexie {
  events!: Table<SetuEvent, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super('setu');
    this.version(1).stores({
      // Bump the version + add a migration when these indexes change.
      events: 'id, t, gh, ts, au, [t+gh], st, pst',
      meta: 'key',
    });
  }
}

export const db = new SetuDB();
