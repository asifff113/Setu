import { Directory, Filesystem } from '@capacitor/filesystem';
import { fromBase64url, toBase64url, type SetuEvent } from '@setu/shared';
import { ingestEvents } from '../db/events';
import { db, type IdentityRow, type SettingsRow } from '../db/schema';
import { readSettings, writeSettings } from '../db/settings';
import { decodeBundle, encodeBundle } from './bundle';
import { isNative } from './platform';

export const BACKUP_DIR = 'backup';
export const MAX_EVENTS_PER_BACKUP_FILE = 5000;

/** JSON-safe snapshot of the identity row — key bytes travel as base64url. */
interface IdentityBackup {
  secretKey: string;
  publicKey: string;
  author: string;
  createdAt: number;
}

function bytesToStdBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function stdBase64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function chunkEventsForBackup(events: SetuEvent[], maxPerChunk = MAX_EVENTS_PER_BACKUP_FILE): SetuEvent[][] {
  if (events.length === 0) return [];
  // Sorted newest first
  const sorted = [...events].sort((a, b) => b.ts - a.ts);
  const chunks: SetuEvent[][] = [];
  for (let i = 0; i < sorted.length; i += maxPerChunk) {
    chunks.push(sorted.slice(i, i + maxPerChunk));
  }
  return chunks;
}

export async function performAutoBackup(): Promise<string | null> {
  if (!isNative()) return null;
  try {
    const events = await db.events.toArray();
    const identity = await db.meta.get('identity');
    const settings = await readSettings();

    // Ensure directory exists
    try {
      await Filesystem.mkdir({ path: BACKUP_DIR, directory: Directory.Data, recursive: true });
    } catch {
      /* already exists */
    }

    // Save Identity
    if (identity && identity.key === 'identity') {
      const identityBackup: IdentityBackup = {
        secretKey: toBase64url(identity.secretKey),
        publicKey: toBase64url(identity.publicKey),
        author: identity.author,
        createdAt: identity.createdAt,
      };
      await Filesystem.writeFile({
        path: `${BACKUP_DIR}/identity.bin`,
        data: btoa(JSON.stringify(identityBackup)),
        directory: Directory.Data,
      });
    }

    // Save Settings
    await Filesystem.writeFile({
      path: `${BACKUP_DIR}/settings.json`,
      data: btoa(JSON.stringify(settings)),
      directory: Directory.Data,
    });

    // Save Event Log Chunks
    const chunks = chunkEventsForBackup(events);
    for (const [idx, chunk] of chunks.entries()) {
      const bundleBytes = await encodeBundle(chunk);
      const filename = `${BACKUP_DIR}/backup-${String(idx + 1).padStart(4, '0')}.setu`;
      await Filesystem.writeFile({
        path: filename,
        data: bytesToStdBase64(bundleBytes),
        directory: Directory.Data,
      });
    }

    const timestamp = new Date().toISOString();
    await Filesystem.writeFile({
      path: `${BACKUP_DIR}/meta.json`,
      data: btoa(JSON.stringify({ lastBackupAt: timestamp, chunksCount: chunks.length })),
      directory: Directory.Data,
    });

    return timestamp;
  } catch (e) {
    console.error('Auto-backup failed:', e);
    return null;
  }
}

export async function checkBackupExists(): Promise<{ exists: boolean; lastBackupAt?: string }> {
  if (!isNative()) return { exists: false };
  try {
    const res = await Filesystem.readFile({
      path: `${BACKUP_DIR}/meta.json`,
      directory: Directory.Data,
    });
    if (res && res.data) {
      const meta = JSON.parse(atob(res.data as string));
      return { exists: true, lastBackupAt: meta.lastBackupAt };
    }
  } catch {
    return { exists: false };
  }
  return { exists: false };
}

export async function restoreBackup(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    // 1. Restore Identity
    try {
      const idRes = await Filesystem.readFile({ path: `${BACKUP_DIR}/identity.bin`, directory: Directory.Data });
      if (idRes && idRes.data) {
        const idData = JSON.parse(atob(idRes.data as string)) as IdentityBackup;
        const row: IdentityRow = {
          key: 'identity',
          secretKey: fromBase64url(idData.secretKey),
          publicKey: fromBase64url(idData.publicKey),
          author: idData.author,
          createdAt: idData.createdAt,
        };
        await db.meta.put(row);
      }
    } catch {
      /* ignore if missing */
    }

    // 2. Restore Settings
    try {
      const stRes = await Filesystem.readFile({ path: `${BACKUP_DIR}/settings.json`, directory: Directory.Data });
      if (stRes && stRes.data) {
        const stData = JSON.parse(atob(stRes.data as string)) as SettingsRow;
        await writeSettings(stData);
      }
    } catch {
      /* ignore if missing */
    }

    // 3. Restore Bundles
    const dirContent = await Filesystem.readdir({ path: BACKUP_DIR, directory: Directory.Data });
    const bundleFiles = dirContent.files
      .map((f) => (typeof f === 'string' ? f : f.name))
      .filter((name) => name.startsWith('backup-') && name.endsWith('.setu'))
      .sort();

    for (const file of bundleFiles) {
      const fileRes = await Filesystem.readFile({ path: `${BACKUP_DIR}/${file}`, directory: Directory.Data });
      if (fileRes && fileRes.data) {
        const events = await decodeBundle(stdBase64ToBytes(fileRes.data as string));
        if (events.length > 0) {
          await ingestEvents(events);
        }
      }
    }
    return true;
  } catch (e) {
    console.error('Backup restore failed:', e);
    return false;
  }
}
