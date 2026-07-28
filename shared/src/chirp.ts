/**
 * Chirp compact single-event codec (Phase 8) — the binary payload that travels
 * over *sound* (ggwave) between a speaker and a microphone, the last rung on the
 * transport ladder for when there is no network, no camera, and no button-phone
 * SMS gateway either.
 *
 * ggwave can move at most {@link MAX_CHIRP_BYTES} bytes per transmission, so the
 * gzip+CBOR bundle codec (which QR Beam and files use) is far too heavy for even
 * a single event: a signed `SetuEvent` already carries an unavoidable 32-byte
 * author key + 64-byte signature, and base64-stringifying those alone overflows
 * the budget. This codec instead packs one event into a tight binary frame,
 * sending `au`/`sig` as raw bytes and *omitting* the 16-byte id entirely — the
 * receiver recomputes it with {@link deriveId}, exactly as `verifyEvent` does.
 *
 * The reconstructed event is byte-for-byte identical in its signed content, so
 * it flows through the same verified `ingestEvents` gate as every other
 * transport: a tampered frame simply fails the signature check and is dropped.
 *
 * Frame layout (little-endian), all sizes in bytes:
 *   [0]      header  = 0xC0 | typeCode      // top 6 bits mark a Chirp v1 frame
 *   [1]      mask    = presence bits (see F_* below), incl. non-default ttl
 *   [2..5]   ts      = uint32
 *   [..]     ttl     = uint32               // only if mask & F_TTL
 *   [..]     gh      = len(1) + UTF-8        // may be empty (len 0)
 *   [..]     au      = 32 raw bytes
 *   [..]     ...present optionals, in field order (see encode)...
 *   [..-64]  sig     = 64 raw bytes          // always the trailing 64 bytes
 *
 * Only app-origin, author-signed events can be chirped: `sms`-sourced events are
 * relay-attested (no meaningful author key) and refused by the encoder.
 */
import { fromBase64url, toBase64url } from './base64.js';
import { deriveId } from './codec.js';
import {
  DEFAULT_TTL_SECONDS,
  type SetuCategory,
  type SetuEvent,
  type SetuEventType,
  type SetuPersonStatus,
  type SetuStatus,
} from './types.js';

/**
 * ggwave's hard per-transmission ceiling. Payloads above this are silently
 * truncated by the codec on the wire, so the sender must refuse them.
 */
export const MAX_CHIRP_BYTES = 140;

/** Top 6 bits of the header byte tag a Chirp v1 frame; low 2 bits carry the type. */
const HEADER_MAGIC = 0xc0;
const HEADER_MASK = 0xfc;

/** Standard geohash base32 alphabet — packed 5 bits/char to save wire bytes. */
const GEOHASH_BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

// Enum <-> small-int tables. Order is the wire contract — append only, never
// reorder, or old frames decode to the wrong value.
const CHIRP_TYPES: readonly SetuEventType[] = ['checkin', 'help', 'bulletin', 'person'];
const CHIRP_CATS: readonly SetuCategory[] = ['med', 'rescue', 'food', 'water', 'shelter', 'other'];
const CHIRP_STATUSES: readonly SetuStatus[] = ['safe', 'need'];
const CHIRP_PERSON_STATUSES: readonly SetuPersonStatus[] = ['missing', 'found', 'seen'];

// Presence bits in the mask byte.
const F_N = 0x01;
const F_ST = 0x02;
const F_CAT = 0x04;
const F_MSG = 0x08;
const F_LOC = 0x10;
const F_PN = 0x20;
const F_PST = 0x40;
const F_TTL = 0x80;

/** Thrown for structurally un-chirpable events (sms-sourced, over-long fields). */
export class ChirpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChirpError';
  }
}

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder();

function enumIndex<T>(list: readonly T[], value: T, label: string): number {
  const i = list.indexOf(value);
  if (i < 0) throw new ChirpError(`chirp: unknown ${label} "${String(value)}"`);
  return i;
}

function enumAt<T>(list: readonly T[], index: number, label: string): T {
  const value = list[index];
  if (value === undefined) throw new ChirpError(`chirp: bad ${label} index ${index}`);
  return value;
}

function pushU32(out: number[], value: number): void {
  const n = value >>> 0;
  out.push(n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff);
}

function pushI32(out: number[], value: number): void {
  const n = value | 0;
  out.push(n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff);
}

function pushStr(out: number[], label: string, value: string): void {
  const bytes = utf8Encoder.encode(value);
  if (bytes.length > 255) {
    throw new ChirpError(`chirp: ${label} too long (${bytes.length} bytes, max 255)`);
  }
  out.push(bytes.length);
  for (const b of bytes) out.push(b);
}

function pushBytes(out: number[], bytes: Uint8Array): void {
  for (const b of bytes) out.push(b);
}

/**
 * Geohashes are base32, so we pack 5 bits per char (a length byte + the packed
 * codes) instead of a raw UTF-8 string — a precision-6 area shrinks 7B → 5B,
 * the headroom a full Bangla name needs to still fit under the ggwave ceiling.
 */
function pushGeohash(out: number[], gh: string): void {
  if (gh.length > 255) throw new ChirpError(`chirp: geohash too long (${gh.length} chars)`);
  out.push(gh.length);
  let acc = 0;
  let nbits = 0;
  for (const c of gh) {
    const code = GEOHASH_BASE32.indexOf(c);
    if (code < 0) throw new ChirpError(`chirp: non-geohash character in gh "${gh}"`);
    acc = (acc << 5) | code;
    nbits += 5;
    while (nbits >= 8) {
      nbits -= 8;
      out.push((acc >>> nbits) & 0xff);
      acc &= (1 << nbits) - 1;
    }
  }
  if (nbits > 0) out.push((acc << (8 - nbits)) & 0xff);
}

/**
 * Encode one event into its compact Chirp frame. Throws {@link ChirpError} for
 * events that structurally cannot be chirped (sms-sourced, over-long strings);
 * the returned length may still exceed {@link MAX_CHIRP_BYTES}, so callers must
 * check `bytes.length <= MAX_CHIRP_BYTES` before transmitting.
 */
export function encodeChirpEvent(event: SetuEvent): Uint8Array {
  if (event.src) {
    throw new ChirpError('chirp: only app-origin, author-signed events can be sent by sound');
  }

  const author = fromBase64url(event.au);
  if (author.length !== 32) throw new ChirpError('chirp: author key must be 32 bytes');
  const signature = fromBase64url(event.sig);
  if (signature.length !== 64) throw new ChirpError('chirp: signature must be 64 bytes');

  const out: number[] = [];
  out.push(HEADER_MAGIC | enumIndex(CHIRP_TYPES, event.t, 'type'));

  const ttlDefault = event.ttl === DEFAULT_TTL_SECONDS;
  let mask = 0;
  if (event.n !== undefined) mask |= F_N;
  if (event.st !== undefined) mask |= F_ST;
  if (event.cat !== undefined) mask |= F_CAT;
  if (event.msg !== undefined) mask |= F_MSG;
  if (event.loc !== undefined) mask |= F_LOC;
  if (event.pn !== undefined) mask |= F_PN;
  if (event.pst !== undefined) mask |= F_PST;
  if (!ttlDefault) mask |= F_TTL;
  out.push(mask);

  pushU32(out, event.ts);
  if (!ttlDefault) pushU32(out, event.ttl);
  pushGeohash(out, event.gh);
  pushBytes(out, author);

  // Field order here is the wire contract; the decoder reads them identically.
  if (event.n !== undefined) pushStr(out, 'n', event.n);
  if (event.st !== undefined) out.push(enumIndex(CHIRP_STATUSES, event.st, 'status'));
  if (event.cat !== undefined) out.push(enumIndex(CHIRP_CATS, event.cat, 'category'));
  if (event.msg !== undefined) pushStr(out, 'msg', event.msg);
  if (event.loc !== undefined) {
    pushI32(out, Math.round(event.loc[0] * 1000));
    pushI32(out, Math.round(event.loc[1] * 1000));
  }
  if (event.pn !== undefined) pushStr(out, 'pn', event.pn);
  if (event.pst !== undefined) {
    out.push(enumIndex(CHIRP_PERSON_STATUSES, event.pst, 'person status'));
  }

  pushBytes(out, signature);
  return Uint8Array.from(out);
}

/**
 * Decode a Chirp frame back into a full, id-bearing {@link SetuEvent}. The
 * result is *unverified* — feed it to `ingestEvents`, which checks the
 * signature. Throws {@link ChirpError} for anything that isn't a well-formed
 * Chirp frame (foreign ggwave transmissions, truncation, bad enum indices).
 */
export function decodeChirpEvent(bytes: Uint8Array): SetuEvent {
  let p = 0;
  const take = (n: number): void => {
    if (p + n > bytes.length) throw new ChirpError('chirp: truncated payload');
  };
  const u8 = (): number => {
    take(1);
    return bytes[p++]!;
  };
  const u32 = (): number => {
    take(4);
    const v = bytes[p]! | (bytes[p + 1]! << 8) | (bytes[p + 2]! << 16) | (bytes[p + 3]! << 24);
    p += 4;
    return v >>> 0;
  };
  const i32 = (): number => {
    take(4);
    const v = bytes[p]! | (bytes[p + 1]! << 8) | (bytes[p + 2]! << 16) | (bytes[p + 3]! << 24);
    p += 4;
    return v | 0;
  };
  const str = (): string => {
    const len = u8();
    take(len);
    const s = utf8Decoder.decode(bytes.subarray(p, p + len));
    p += len;
    return s;
  };
  const raw = (n: number): Uint8Array => {
    take(n);
    const slice = bytes.subarray(p, p + n);
    p += n;
    return slice;
  };
  const geohash = (): string => {
    const len = u8();
    const packed = raw(Math.ceil((len * 5) / 8));
    let acc = 0;
    let nbits = 0;
    let out = '';
    for (const b of packed) {
      acc = (acc << 8) | b;
      nbits += 8;
      while (nbits >= 5 && out.length < len) {
        nbits -= 5;
        out += GEOHASH_BASE32[(acc >>> nbits) & 0x1f]!;
        acc &= (1 << nbits) - 1;
      }
    }
    return out;
  };

  const header = u8();
  if ((header & HEADER_MASK) !== HEADER_MAGIC) {
    throw new ChirpError('chirp: not a Setu sound frame');
  }
  const t = enumAt(CHIRP_TYPES, header & 0x03, 'type');
  const mask = u8();

  const ts = u32();
  const ttl = (mask & F_TTL) !== 0 ? u32() : DEFAULT_TTL_SECONDS;
  const gh = geohash();
  const au = toBase64url(raw(32));

  // Rebuild the signed content body in the same shape createEvent produced, so
  // deriveId recomputes the identical id and the signature verifies. Optionals
  // are set only when their mask bit is present — matching the encoder — so the
  // canonical key set is exactly right.
  const body: Partial<SetuEvent> = { v: 1, t, ts, ttl, gh, au };
  if ((mask & F_N) !== 0) body.n = str();
  if ((mask & F_ST) !== 0) body.st = enumAt(CHIRP_STATUSES, u8(), 'status');
  if ((mask & F_CAT) !== 0) body.cat = enumAt(CHIRP_CATS, u8(), 'category');
  if ((mask & F_MSG) !== 0) body.msg = str();
  if ((mask & F_LOC) !== 0) body.loc = [i32() / 1000, i32() / 1000];
  if ((mask & F_PN) !== 0) body.pn = str();
  if ((mask & F_PST) !== 0) body.pst = enumAt(CHIRP_PERSON_STATUSES, u8(), 'person status');

  const sig = toBase64url(raw(64));
  if (p !== bytes.length) throw new ChirpError('chirp: trailing bytes');

  const id = deriveId(body);
  return { ...body, id, sig } as SetuEvent;
}
