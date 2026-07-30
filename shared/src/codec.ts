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
import {
  DEFAULT_TTL_SECONDS,
  CHAT_TTL_SECONDS,
  MAX_FUTURE_SKEW_SECONDS,
  MAX_TTL_SECONDS,
  type SetuEvent,
} from './types.js';

// records:false => no cbor-x "structure" tags; variableMapSize keeps small
// maps compact. Insertion order is preserved for string keys, so sorting keys
// ourselves yields a canonical layout.
const encoder = new Encoder({ useRecords: false, variableMapSize: true });

/** Fields that never participate in the content hash. */
const VIEW_KEYS = ['resolved', 'responders', 'replies', 'retracted'];
const EVENT_KEYS = new Set([
  'v', 't', 'id', 'ts', 'ttl', 'gh', 'au', 'n', 'st', 'cat', 'msg', 'loc',
  'pn', 'pst', 're', 'ak', 'att', 'urg', 'sev', 'src', 'x', 'sig',
]);
const NON_CONTENT_KEYS = new Set(['id', 'sig', ...VIEW_KEYS]);
const NON_SIGNED_KEYS = new Set(['sig', ...VIEW_KEYS]);

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
    out[key] =
      value && typeof value === 'object' && !Array.isArray(value)
        ? canonicalObject(value as Record<string, unknown>, new Set())
        : value;
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
    canonicalObject(event as Record<string, unknown>, NON_SIGNED_KEYS),
    // View annotations are derived locally and never part of the signed wire
    // event; excluding them lets trust badges verify annotated cards.
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
    ttl: input.ttl ?? (input.t === 'chat' ? CHAT_TTL_SECONDS : DEFAULT_TTL_SECONDS),
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
    if (author.length !== 32 || toBase64url(author) !== event.au) return false;
    const sig = fromBase64url(event.sig);
    if (sig.length !== 64 || toBase64url(sig) !== event.sig) return false;
    return verifyDetached(sig, signedBytes(event), author);
  } catch {
    return false;
  }
}

/** True when the event's lifetime has elapsed relative to `nowSeconds`. */
export function isExpired(event: SetuEvent, nowSeconds: number): boolean {
  return event.ts < nowSeconds - event.ttl;
}

export function isFutureDated(event: SetuEvent, nowSeconds: number): boolean {
  return event.ts > nowSeconds + MAX_FUTURE_SKEW_SECONDS;
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
  'reply',
  'ack',
  'retract',
  'chat',
]);
const STATUSES: ReadonlySet<string> = new Set(['safe', 'need', 'offer']);
const CATEGORIES: ReadonlySet<string> = new Set([
  'med', 'rescue', 'food', 'water', 'shelter', 'other',
]);
const PERSON_STATUSES: ReadonlySet<string> = new Set(['missing', 'found', 'seen']);
const SOURCES: ReadonlySet<string> = new Set(['app', 'sms']);
const ACK_KINDS: ReadonlySet<string> = new Set(['onit', 'done', 'seen']);
const ATTACHMENT_KINDS: ReadonlySet<string> = new Set(['img', 'aud']);
const URGENCIES: ReadonlySet<string> = new Set(['normal', 'urgent', 'critical']);
const SEVERITIES: ReadonlySet<string> = new Set(['info', 'warning', 'danger']);
const B64URL_RE = /^[A-Za-z0-9_-]+$/;
const GEOHASH_RE = /^[0123456789bcdefghjkmnpqrstuvwxyz]{0,12}$/;

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
  if (VIEW_KEYS.some((key) => key in (event as unknown as Record<string, unknown>))) return false;
  if (Object.keys(event).some((key) => !EVENT_KEYS.has(key))) return false;
  if (event.v !== 1) return false;
  if (typeof event.t !== 'string' || !EVENT_TYPES.has(event.t)) return false;
  if (typeof event.id !== 'string' || event.id.length !== 22 || !B64URL_RE.test(event.id)) return false;
  if (typeof event.sig !== 'string' || event.sig.length !== 86 || !B64URL_RE.test(event.sig)) return false;
  if (typeof event.au !== 'string' || event.au.length !== 43 || !B64URL_RE.test(event.au)) return false;
  if (typeof event.gh !== 'string' || !GEOHASH_RE.test(event.gh)) return false;
  if (!Number.isSafeInteger(event.ts) || !Number.isSafeInteger(event.ttl)) return false;
  if (event.ts < 0 || event.ttl < 1 || event.ttl > MAX_TTL_SECONDS) return false;
  if (event.n !== undefined && (typeof event.n !== 'string' || event.n.length < 1 || event.n.length > 32)) return false;
  if (event.pn !== undefined && (typeof event.pn !== 'string' || event.pn.length < 1 || event.pn.length > 48)) return false;
  if (event.msg !== undefined && (typeof event.msg !== 'string' || event.msg.length > 280)) return false;
  if (event.x !== undefined && (typeof event.x !== 'string' || event.x.length < 1 || event.x.length > 80)) return false;
  if (event.st !== undefined && !STATUSES.has(event.st)) return false;
  if (event.cat !== undefined && !CATEGORIES.has(event.cat)) return false;
  if (event.pst !== undefined && !PERSON_STATUSES.has(event.pst)) return false;
  if (event.src !== undefined && !SOURCES.has(event.src)) return false;
  if (event.re !== undefined && (typeof event.re !== 'string' || event.re.length !== 22 || !B64URL_RE.test(event.re))) return false;
  if (event.ak !== undefined && !ACK_KINDS.has(event.ak)) return false;
  if (event.urg !== undefined && !URGENCIES.has(event.urg)) return false;
  if (event.sev !== undefined && !SEVERITIES.has(event.sev)) return false;
  if (event.att !== undefined) {
    const att: unknown = event.att;
    if (!att || typeof att !== 'object' || Array.isArray(att)) return false;
    const value = att as Record<string, unknown>;
    const allowed = new Set(['h', 'k', 'sz', 'w', 'hh']);
    if (Object.keys(value).some((key) => !allowed.has(key))) return false;
    if (typeof value.h !== 'string' || value.h.length !== 43 || !B64URL_RE.test(value.h)) return false;
    if (typeof value.k !== 'string' || !ATTACHMENT_KINDS.has(value.k)) return false;
    const maxSize = value.k === 'img' ? 150_000 : 100_000;
    if (!Number.isSafeInteger(value.sz) || (value.sz as number) < 1 || (value.sz as number) > maxSize) return false;
    if (value.w !== undefined && (!Number.isSafeInteger(value.w) || (value.w as number) < 1 || (value.w as number) > 1280)) return false;
    if (value.hh !== undefined && (typeof value.hh !== 'string' || value.hh.length < 6 || value.hh.length > 64)) return false;
  }
  if (event.loc !== undefined) {
    const loc: unknown = event.loc;
    if (
      !Array.isArray(loc) ||
      loc.length !== 2 ||
      !loc.every((n) => typeof n === 'number' && Number.isFinite(n)) ||
      loc[0]! < -90 || loc[0]! > 90 || loc[1]! < -180 || loc[1]! > 180
    ) {
      return false;
    }
  }
  if (
    event.t === 'checkin' &&
    (event.st !== 'safe' || event.pn !== undefined || event.pst !== undefined ||
      event.cat !== undefined || event.re !== undefined || event.ak !== undefined ||
      event.att !== undefined || event.urg !== undefined || event.sev !== undefined)
  ) return false;
  if (
    event.t === 'help' &&
    ((event.st !== 'need' && event.st !== 'offer') || event.pn !== undefined ||
      event.pst !== undefined || event.re !== undefined || event.ak !== undefined ||
      event.sev !== undefined)
  ) return false;
  if (
    event.t === 'bulletin' &&
    (event.msg === undefined || event.msg.trim().length === 0 || event.st !== undefined || event.cat !== undefined ||
      event.pn !== undefined || event.pst !== undefined || event.re !== undefined ||
      event.ak !== undefined || event.urg !== undefined)
  ) return false;
  if (
    event.t === 'person' &&
    (event.pn === undefined || event.pst === undefined || event.st !== undefined ||
      event.cat !== undefined || event.re !== undefined || event.ak !== undefined ||
      event.urg !== undefined || event.sev !== undefined)
  ) return false;
  if (
    event.t === 'reply' &&
    (event.re === undefined || event.msg === undefined || event.msg.trim().length === 0 ||
      event.st !== undefined || event.cat !== undefined || event.pn !== undefined ||
      event.pst !== undefined || event.ak !== undefined || event.loc !== undefined ||
      event.urg !== undefined || event.sev !== undefined)
  ) return false;
  if (
    event.t === 'ack' &&
    (event.re === undefined || event.ak === undefined ||
      (event.msg !== undefined && event.msg.length > 140) || event.st !== undefined ||
      event.cat !== undefined || event.pn !== undefined || event.pst !== undefined ||
      event.att !== undefined || event.loc !== undefined || event.urg !== undefined ||
      event.sev !== undefined)
  ) return false;
  if (
    event.t === 'retract' &&
    (event.re === undefined || event.n !== undefined || event.msg !== undefined ||
      event.st !== undefined || event.cat !== undefined || event.pn !== undefined ||
      event.pst !== undefined || event.ak !== undefined || event.att !== undefined ||
      event.loc !== undefined || event.urg !== undefined || event.sev !== undefined)
  ) return false;
  if (
    event.t === 'chat' &&
    (event.msg === undefined || event.msg.trim().length === 0 || event.gh.length === 0 ||
      event.ttl > CHAT_TTL_SECONDS || event.st !== undefined || event.cat !== undefined ||
      event.pn !== undefined || event.pst !== undefined || event.re !== undefined ||
      event.ak !== undefined || event.loc !== undefined || event.urg !== undefined ||
      event.sev !== undefined)
  ) return false;
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
