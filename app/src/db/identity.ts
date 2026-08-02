import { generateKeypair, pubkeyToAuthor } from '@setu/shared';
import { db, type ActiveKeyRow, type GuestIdentityRow, type IdentityRow } from './schema';

const GUEST_MAX_AGE_SECONDS = 72 * 60 * 60; // 72 hours

export type ActiveIdentity = {
  row: IdentityRow | GuestIdentityRow;
  isGuest: boolean;
};

/**
 * Return the device identity, generating and persisting a fresh Ed25519
 * keypair on first run. Runs inside a transaction so React StrictMode's
 * double-invoked effects can't race two keypairs into existence.
 */
export async function loadOrCreateIdentity(): Promise<IdentityRow> {
  return db.transaction('rw', db.meta, async () => {
    const existing = await db.meta.get('identity');
    if (existing && existing.key === 'identity') return existing as IdentityRow;

    const kp = generateKeypair();
    const row: IdentityRow = {
      key: 'identity',
      secretKey: kp.secretKey,
      publicKey: kp.publicKey,
      author: pubkeyToAuthor(kp.publicKey),
      createdAt: Math.floor(Date.now() / 1000),
    };
    await db.meta.put(row);
    return row;
  });
}

/**
 * Get active identity row (primary device identity or active guest identity).
 * Automatically archives guest identities older than 72 hours.
 */
export async function getActiveIdentity(): Promise<ActiveIdentity> {
  return db.transaction('rw', db.meta, async () => {
    const primary = await loadOrCreateIdentity();
    const activeSlot = (await db.meta.get('active_identity_slot')) as ActiveKeyRow | undefined;
    const guest = (await db.meta.get('guest_identity')) as GuestIdentityRow | undefined;

    const now = Math.floor(Date.now() / 1000);

    if (guest && guest.createdAt < now - GUEST_MAX_AGE_SECONDS) {
      await db.meta.delete('guest_identity');
      await db.meta.put({ key: 'active_identity_slot', slot: 'primary' });
      return { row: primary, isGuest: false };
    }

    if (activeSlot?.slot === 'guest' && guest) {
      return { row: guest, isGuest: true };
    }

    return { row: primary, isGuest: false };
  });
}

/**
 * Create a fresh Ed25519 keypair for guest borrower mode and activate it.
 */
export async function createGuestIdentity(guestName: string): Promise<GuestIdentityRow> {
  return db.transaction('rw', db.meta, async () => {
    const kp = generateKeypair();
    const guestRow: GuestIdentityRow = {
      key: 'guest_identity',
      secretKey: kp.secretKey,
      publicKey: kp.publicKey,
      author: pubkeyToAuthor(kp.publicKey),
      name: guestName.trim() || 'Guest',
      createdAt: Math.floor(Date.now() / 1000),
    };

    await db.meta.put(guestRow);
    await db.meta.put({ key: 'active_identity_slot', slot: 'guest' });
    return guestRow;
  });
}

/**
 * Switch back to the primary device identity.
 */
export async function switchToPrimaryIdentity(): Promise<IdentityRow> {
  return db.transaction('rw', db.meta, async () => {
    await db.meta.put({ key: 'active_identity_slot', slot: 'primary' });
    return loadOrCreateIdentity();
  });
}
