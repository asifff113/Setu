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
  locality: string; // optional free-text thana/neighborhood within the selected district
  lang: Language;
  onboarded: boolean;
  hintsSeen: string[];
  mutedAuthors: string[];
  watchedAuthors: Array<{ au: string; name: string }>;
  autoDownloadMedia: boolean;
  responderMode: boolean;
  theme: 'system' | 'light' | 'dark';
  batterySaver: boolean;
  largeText: boolean;
  lastSeen: Record<string, number>;
  updatedAt: number; // unix seconds
}

export interface BlobCacheRow {
  h: string;
  blob: Blob;
  mime: string;
  createdAt: number;
}

export interface CircleRow {
  au: string;
  name: string;
  addedAt: number;
}

export interface GuestIdentityRow {
  key: 'guest_identity';
  secretKey: Uint8Array;
  publicKey: Uint8Array;
  author: string;
  name: string;
  createdAt: number;
}

export interface ActiveKeyRow {
  key: 'active_identity_slot';
  slot: 'primary' | 'guest';
}

/** Singleton rows in the `meta` key-value table, discriminated by `key`. */
export type MetaRow = IdentityRow | GuestIdentityRow | ActiveKeyRow | SettingsRow;

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
  blobs!: Table<BlobCacheRow, string>;
  circles!: Table<CircleRow, string>;

  constructor() {
    super('setu');
    this.version(1).stores({
      // Bump the version + add a migration when these indexes change.
      events: 'id, t, gh, ts, au, [t+gh], st, pst',
      meta: 'key',
    });
    this.version(2).stores({
      events: 'id, t, gh, ts, au, [t+gh], st, pst',
      meta: 'key',
      blobs: 'h, createdAt',
      circles: 'au, addedAt',
    });
  }
}

export const db = new SetuDB();
