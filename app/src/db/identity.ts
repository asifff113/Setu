import { generateKeypair, pubkeyToAuthor } from '@setu/shared';
import { db, type IdentityRow } from './schema';

/**
 * Return the device identity, generating and persisting a fresh Ed25519
 * keypair on first run. Runs inside a transaction so React StrictMode's
 * double-invoked effects can't race two keypairs into existence.
 */
export async function loadOrCreateIdentity(): Promise<IdentityRow> {
  return db.transaction('rw', db.meta, async () => {
    const existing = await db.meta.get('identity');
    if (existing && existing.key === 'identity') return existing;

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
