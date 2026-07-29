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
 * Serialized-event ceiling. A legitimate event tops out well under 1.5 KB even
 * with a full 280-char multibyte (Bengali) message; anything larger is abuse.
 * A valid signature only proves the author signed *these bytes* — it says
 * nothing about their size, so without this gate an attacker can sign, with
 * their own keypair, an event carrying a 1 MB `msg` and it verifies + stores +
 * broadcasts to every peer.
 */
export const MAX_EVENT_BYTES = 4096;

const EVENT_TYPES: ReadonlySet<string> = new Set([
  'checkin',
  'help',
  'bulletin',
  'person',
]);

/** UTF-8 byte length without allocating a Buffer (runs in browser + node). */
function utf8Length(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4; // surrogate pair -> one 4-byte code point
      i++;
    } else bytes += 3;
  }
  return bytes;
}

/**
 * Cheap structural + size sanity check, independent of the signature.
 *
 * `verifyEvent` proves authenticity but not well-formedness: an attacker can
 * sign an event with a 1 MB `msg`, numeric text fields, or a missing `gh` with
 * their own key and it verifies. Every ingest gate (relay store, app DB — the
 * choke points every transport funnels through) runs this *before* the crypto
 * check, so malformed or oversized events are dropped cheaply, before they cost
 * a signature verification or reach the store. Returns false, never throws.
 */
export function isValidEventShape(event: SetuEvent): boolean {
  if (!event || typeof event !== 'object') return false;
  if (event.v !== 1) return false;
  if (typeof event.t !== 'string' || !EVENT_TYPES.has(event.t)) return false;
  if (typeof event.id !== 'string' || typeof event.sig !== 'string') return false;
  if (typeof event.au !== 'string' || typeof event.gh !== 'string') return false;
  if (!Number.isFinite(event.ts) || !Number.isFinite(event.ttl)) return false;
  if (event.ts < 0 || event.ttl < 0) return false;
  // Optional string fields: strings within generous multiples of the model caps
  // (n≤32, pn≤48, msg≤280 chars). Doubled so no legitimate event is rejected;
  // the byte ceiling below is the real backstop against oversized payloads.
  if (event.n !== undefined && (typeof event.n !== 'string' || event.n.length > 64)) return false;
  if (event.pn !== undefined && (typeof event.pn !== 'string' || event.pn.length > 96)) return false;
  if (event.msg !== undefined && (typeof event.msg !== 'string' || event.msg.length > 560)) return false;
  for (const key of ['st', 'cat', 'pst', 'src'] as const) {
    if (event[key] !== undefined && typeof event[key] !== 'string') return false;
  }
  if (event.loc !== undefined) {
    const loc: unknown = event.loc;
    if (
      !Array.isArray(loc) ||
      loc.length !== 2 ||
      !loc.every((n) => typeof n === 'number' && Number.isFinite(n))
    ) {
      return false;
    }
  }
  return utf8Length(JSON.stringify(event)) <= MAX_EVENT_BYTES;
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
