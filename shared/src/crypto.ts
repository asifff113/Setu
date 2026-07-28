/**
 * Ed25519 identity + SHA-256 primitives, shared by app and relay.
 *
 * @noble/ed25519 v3 exposes synchronous `sign`/`verify` that need a SHA-512
 * implementation wired in. We supply @noble/hashes' `sha512` so signing works
 * offline with no WebCrypto / async ceremony.
 */
import * as ed from '@noble/ed25519';
import { sha256, sha512 } from '@noble/hashes/sha2.js';
import { toBase64url } from './base64.js';

// Wire the sync SHA-512 hook once, at module load.
ed.hashes.sha512 = sha512;

/** An Ed25519 keypair. Both halves are 32 raw bytes. */
export type Keypair = {
  /** 32-byte Ed25519 seed / secret key. Never leaves the device. */
  secretKey: Uint8Array;
  /** 32-byte Ed25519 public key. Shared as the author id. */
  publicKey: Uint8Array;
};

/** Generate a fresh random keypair. */
export function generateKeypair(): Keypair {
  const secretKey = ed.utils.randomSecretKey();
  const publicKey = ed.getPublicKey(secretKey);
  return { secretKey, publicKey };
}

/** Derive the public key from a 32-byte secret key. */
export function publicKeyFromSecret(secretKey: Uint8Array): Uint8Array {
  return ed.getPublicKey(secretKey);
}

/** Sign a message, returning the raw 64-byte detached signature. */
export function signDetached(
  message: Uint8Array,
  secretKey: Uint8Array,
): Uint8Array {
  return ed.sign(message, secretKey);
}

/**
 * Verify a detached signature. Returns false (never throws) on malformed
 * inputs so callers can treat verification as a pure predicate.
 */
export function verifyDetached(
  signature: Uint8Array,
  message: Uint8Array,
  publicKey: Uint8Array,
): boolean {
  try {
    return ed.verify(signature, message, publicKey);
  } catch {
    return false;
  }
}

/** SHA-256 of raw bytes. */
export function sha256Bytes(data: Uint8Array): Uint8Array {
  return sha256(data);
}

/** A public key as the canonical base64url author string used in `au`. */
export function pubkeyToAuthor(publicKey: Uint8Array): string {
  return toBase64url(publicKey);
}
