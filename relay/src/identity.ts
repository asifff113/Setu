/**
 * The relay's own Ed25519 identity. Used from Phase 6 on to sign SMS-sourced
 * events (`src:'sms'`) — button-phone messages have no author key of their own,
 * so the relay attests them with its key. Loaded here in Phase 4 so the key is
 * stable and persisted before it's needed.
 *
 * Source of the seed, in priority order:
 *   1. RELAY_SECRET_KEY env (32-byte hex) — for reproducible cloud deploys.
 *   2. <DATA_DIR>/relay-key.hex — generated once, then reused.
 *   3. A fresh random ephemeral key — for an in-memory relay with no DATA_DIR.
 */
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { publicKeyFromSecret, pubkeyToAuthor } from '@setu/shared';

export interface RelayIdentity {
  secretKey: Uint8Array;
  publicKey: Uint8Array;
  /** base64url(publicKey) — the `au` on relay-signed events. */
  author: string;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase().replace(/^0x/, '');
  if (clean.length !== 64 || /[^0-9a-f]/.test(clean)) {
    throw new Error('RELAY_SECRET_KEY must be a 32-byte hex string (64 hex chars)');
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function loadRelayIdentity(dataDir?: string): RelayIdentity {
  let seed: Uint8Array;
  const env = process.env.RELAY_SECRET_KEY;

  if (env && env.trim()) {
    seed = hexToBytes(env);
  } else if (dataDir && dataDir.trim()) {
    mkdirSync(dataDir, { recursive: true });
    const keyFile = join(dataDir, 'relay-key.hex');
    if (existsSync(keyFile)) {
      seed = hexToBytes(readFileSync(keyFile, 'utf-8'));
    } else {
      seed = new Uint8Array(randomBytes(32));
      writeFileSync(keyFile, bytesToHex(seed), { mode: 0o600 });
    }
  } else {
    seed = new Uint8Array(randomBytes(32)); // ephemeral
  }

  const publicKey = publicKeyFromSecret(seed);
  return { secretKey: seed, publicKey, author: pubkeyToAuthor(publicKey) };
}
