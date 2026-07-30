/**
 * Demo-seed key material, shared by the app (which signs the synthetic
 * `?demo=1` events) and the relay (which must never accept them — a public
 * demo URL must not let a stranger sign valid events as a "demo author" and
 * push them onto a real, shared board). Keeping this derivation in one place
 * means both sides agree on exactly which authors are demo-only.
 */
import { publicKeyFromSecret, pubkeyToAuthor, sha256Bytes, type Keypair } from './crypto.js';

const DEMO_KEYPAIR_COUNT = 16;

// Deterministic, publicly-derivable seeds — this is throwaway synthetic data
// with no security role, not a secret. Anyone can compute these, which is
// exactly why the relay must reject them explicitly rather than relying on
// the keys being unguessable.
function demoKeypair(index: number): Keypair {
  const secretKey = sha256Bytes(new TextEncoder().encode(`setu-demo-seed-v1:${index}`));
  return { secretKey, publicKey: publicKeyFromSecret(secretKey) };
}

/** The fixed pool of demo keypairs, one per synthetic seed event. */
export const DEMO_KEYPAIRS: readonly Keypair[] = Array.from({ length: DEMO_KEYPAIR_COUNT }, (_, i) =>
  demoKeypair(i),
);

/** Author keys (base64url pubkeys) of every synthetic demo event. */
export const DEMO_AUTHORS: ReadonlySet<string> = new Set(
  DEMO_KEYPAIRS.map((kp) => pubkeyToAuthor(kp.publicKey)),
);

/** The fixed id of the one pre-signed, real-publisher-signed demo bulletin. */
export const DEMO_BULLETIN_ID = 'drNkEdIEOz7mEEvoyLbPEA';

/** True for any event that belongs to the local demo seed (see demoSeed.ts). */
export function isDemoAuthor(author: string): boolean {
  return DEMO_AUTHORS.has(author);
}
