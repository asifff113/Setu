/**
 * Canonical CBOR codec + event construction/verification.
 *
 * Canonical form: a CBOR map with keys sorted ascending and `undefined`
 * optional fields omitted, encoded with cbor-x records disabled so the byte
 * layout is deterministic across devices. Two derivations hang off it:
 *
 *   id  = base64url( sha256( canonical(content) )[0..16] )   // content = event minus {id, sig}
 *   sig = base64url( ed25519( canonical(signed) ) )          // signed  = event minus {sig}, i.e. includes id
 *
 * Signing over the id-bearing body binds the signature to the content hash, so
 * `verifyEvent` rejects any change to a field, the id, or the signature.
 */
import { Encoder } from 'cbor-x';
import { fromBase64url, toBase64url } from './base64.js';
import {
  pubkeyToAuthor,
  sha256Bytes,
  signDetached,
  verifyDetached,
  type Keypair,
} from './crypto.js';
import { DEFAULT_TTL_SECONDS, type SetuEvent } from './types.js';

// records:false => no cbor-x "structure" tags; variableMapSize keeps small
// maps compact. Insertion order is preserved for string keys, so sorting keys
// ourselves yields a canonical layout.
const encoder = new Encoder({ useRecords: false, variableMapSize: true });

/** Fields that never participate in the content hash. */
const NON_CONTENT_KEYS = new Set(['id', 'sig']);

/**
 * Build a canonical plain object: keys sorted, `undefined` dropped, optionally
 * excluding a set of keys. Nested values (only `loc`, an array) pass through
 * unchanged since arrays are already order-defined.
 */
function canonicalObject(
  source: Record<string, unknown>,
  exclude: Set<string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(source).sort()) {
    if (exclude.has(key)) continue;
    const value = source[key];
    if (value === undefined) continue;
    out[key] = value;
  }
  return out;
}

/** Canonical CBOR bytes of the content body (event minus id + sig). */
export function contentBytes(event: Partial<SetuEvent>): Uint8Array {
  return encoder.encode(
    canonicalObject(event as Record<string, unknown>, NON_CONTENT_KEYS),
  );
}

/** Canonical CBOR bytes of the signed body (event minus sig; includes id). */
export function signedBytes(event: Partial<SetuEvent>): Uint8Array {
  return encoder.encode(
    canonicalObject(event as Record<string, unknown>, new Set(['sig'])),
  );
}

/** Derive the event id from its content: base64url of the first 16 hash bytes. */
export function deriveId(event: Partial<SetuEvent>): string {
  const digest = sha256Bytes(contentBytes(event));
  return toBase64url(digest.subarray(0, 16));
}

/**
 * The caller-supplied fields for a new event: everything except the machine
 * derived `v`, `id`, `au`, and `sig`. `ttl` defaults to 72h.
 */
export type NewEventInput = Omit<SetuEvent, 'v' | 'id' | 'au' | 'sig' | 'ttl'> & {
  ttl?: number;
};

/**
 * Construct a fully-signed SetuEvent from semantic fields + a keypair.
 * Fills version, author, id, and signature deterministically.
 */
export function createEvent(input: NewEventInput, keypair: Keypair): SetuEvent {
  const base: Omit<SetuEvent, 'id' | 'sig'> = {
    ...input,
    v: 1,
    ttl: input.ttl ?? DEFAULT_TTL_SECONDS,
    au: pubkeyToAuthor(keypair.publicKey),
  };
  const id = deriveId(base);
  const withId = { ...base, id };
  const sig = toBase64url(signDetached(signedBytes(withId), keypair.secretKey));
  return { ...withId, sig };
}

/**
 * Verify an event's integrity end to end:
 *   1. the id matches the recomputed content hash, and
 *   2. the signature verifies against the author key over the signed body.
 * Returns false (never throws) for any malformed or tampered input.
 */
export function verifyEvent(event: SetuEvent): boolean {
  try {
    if (event.id !== deriveId(event)) return false;
    const author = fromBase64url(event.au);
    if (author.length !== 32) return false;
    const sig = fromBase64url(event.sig);
    return verifyDetached(sig, signedBytes(event), author);
  } catch {
    return false;
  }
}

/** True when the event's lifetime has elapsed relative to `nowSeconds`. */
export function isExpired(event: SetuEvent, nowSeconds: number): boolean {
  return event.ts + event.ttl < nowSeconds;
}

/**
 * Union-merge two event collections by id (immutable, order-preserving).
 * The first occurrence of each id wins; ids are content hashes, so duplicate
 * ids are byte-identical events and the choice is immaterial.
 */
export function unionById(...collections: readonly SetuEvent[][]): SetuEvent[] {
  const byId = new Map<string, SetuEvent>();
  for (const collection of collections) {
    for (const event of collection) {
      if (!byId.has(event.id)) byId.set(event.id, event);
    }
  }
  return [...byId.values()];
}
