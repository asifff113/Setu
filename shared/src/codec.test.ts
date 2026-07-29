import { describe, expect, it } from 'vitest';
import { fromBase64url, toBase64url } from './base64.js';
import {
  contentBytes,
  createEvent,
  deriveId,
  isExpired,
  isValidEventShape,
  MAX_EVENT_BYTES,
  signedBytes,
  unionById,
  verifyEvent,
  type NewEventInput,
} from './codec.js';
import { generateKeypair, pubkeyToAuthor } from './crypto.js';
import { bulletinTrust } from './publishers.js';
import { DEFAULT_TTL_SECONDS, type SetuEvent } from './types.js';

const kp = generateKeypair();

function makeCheckin(overrides: Partial<NewEventInput> = {}): SetuEvent {
  const input: NewEventInput = {
    t: 'checkin',
    ts: 1_700_000_000,
    gh: 'wh0r',
    st: 'safe',
    n: 'রহিম',
    ...overrides,
  };
  return createEvent(input, kp);
}

describe('base64url', () => {
  it('round-trips arbitrary bytes', () => {
    for (const len of [0, 1, 2, 3, 16, 31, 32, 64, 255]) {
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = (i * 37 + 11) & 0xff;
      expect(Array.from(fromBase64url(toBase64url(bytes)))).toEqual(
        Array.from(bytes),
      );
    }
  });

  it('emits url-safe unpadded output', () => {
    const s = toBase64url(new Uint8Array([251, 255, 191, 0, 1]));
    expect(s).not.toMatch(/[+/=]/);
  });

  it('tolerates padding and whitespace on decode', () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const padded = toBase64url(bytes) + '==';
    expect(Array.from(fromBase64url(padded))).toEqual(Array.from(bytes));
  });
});

describe('keys', () => {
  it('produces 32-byte public/secret keys', () => {
    const k = generateKeypair();
    expect(k.secretKey.length).toBe(32);
    expect(k.publicKey.length).toBe(32);
  });

  it('encodes author as 43-char base64url of the pubkey', () => {
    const au = pubkeyToAuthor(kp.publicKey);
    expect(fromBase64url(au).length).toBe(32);
  });
});

describe('canonical encoding', () => {
  it('is deterministic regardless of key insertion order', () => {
    const a = { t: 'checkin', v: 1, ts: 10, gh: 'aa', au: 'X', st: 'safe' };
    const b = { st: 'safe', au: 'X', gh: 'aa', ts: 10, v: 1, t: 'checkin' };
    expect(Array.from(contentBytes(a as never))).toEqual(
      Array.from(contentBytes(b as never)),
    );
  });

  it('omits undefined optional fields from the content hash', () => {
    const withUndef = deriveId({
      t: 'checkin',
      v: 1,
      ts: 10,
      gh: 'aa',
      au: 'X',
      st: 'safe',
      msg: undefined,
    } as never);
    const without = deriveId({
      t: 'checkin',
      v: 1,
      ts: 10,
      gh: 'aa',
      au: 'X',
      st: 'safe',
    } as never);
    expect(withUndef).toBe(without);
  });

  it('excludes id and sig from content but keeps id in the signed body', () => {
    const e = makeCheckin();
    // Changing sig must not change the content hash…
    expect(deriveId({ ...e, sig: 'zzzz' })).toBe(e.id);
    // …but the signed body includes id, so a different id changes the bytes.
    const a = signedBytes(e);
    const b = signedBytes({ ...e, id: 'different' });
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });
});

describe('event lifecycle', () => {
  it('creates an event with a 22-char id, valid sig, defaults and author', () => {
    const e = makeCheckin();
    expect(e.v).toBe(1);
    expect(e.ttl).toBe(DEFAULT_TTL_SECONDS);
    expect(e.au).toBe(pubkeyToAuthor(kp.publicKey));
    expect(fromBase64url(e.id).length).toBe(16);
    expect(fromBase64url(e.sig).length).toBe(64);
  });

  it('derives a stable id for identical content', () => {
    const a = makeCheckin();
    const b = makeCheckin();
    expect(b.id).toBe(a.id);
  });

  it('verifies a freshly created event', () => {
    expect(verifyEvent(makeCheckin())).toBe(true);
  });

  it('verifies help, person and bulletin events too', () => {
    const help = createEvent(
      { t: 'help', ts: 1, gh: 'aa', st: 'need', cat: 'water', msg: 'পানি নেই' },
      kp,
    );
    const person = createEvent(
      { t: 'person', ts: 1, gh: 'aa', pn: 'করিম', pst: 'missing' },
      kp,
    );
    const bulletin = createEvent(
      { t: 'bulletin', ts: 1, gh: 'aa', msg: 'Shelter open at school' },
      kp,
    );
    expect([help, person, bulletin].every(verifyEvent)).toBe(true);
  });
});

describe('tamper rejection', () => {
  it('rejects a modified message', () => {
    const e = makeCheckin({ msg: 'ok' as never });
    expect(verifyEvent({ ...e, msg: 'HACKED' })).toBe(false);
  });

  it('rejects a modified status', () => {
    const e = makeCheckin({ st: 'safe' });
    expect(verifyEvent({ ...e, st: 'need' })).toBe(false);
  });

  it('rejects a swapped author (impersonation)', () => {
    const e = makeCheckin();
    const other = generateKeypair();
    expect(verifyEvent({ ...e, au: pubkeyToAuthor(other.publicKey) })).toBe(
      false,
    );
  });

  it('rejects a forged id even when the signature is left intact', () => {
    const e = makeCheckin();
    expect(verifyEvent({ ...e, id: toBase64url(new Uint8Array(16)) })).toBe(
      false,
    );
  });

  it('rejects a corrupted or empty signature', () => {
    const e = makeCheckin();
    expect(verifyEvent({ ...e, sig: '' })).toBe(false);
    expect(verifyEvent({ ...e, sig: toBase64url(new Uint8Array(64)) })).toBe(
      false,
    );
  });
});

describe('event shape / size gate', () => {
  it('accepts a normal event and one with a full multibyte message', () => {
    expect(isValidEventShape(makeCheckin())).toBe(true);
    const help = createEvent(
      { t: 'help', ts: 1, gh: 'wh0r', st: 'need', cat: 'water', msg: 'পা'.repeat(140) },
      kp,
    );
    expect(isValidEventShape(help)).toBe(true);
  });

  it('rejects an event whose serialized size blows past the ceiling', () => {
    // Sign a 1 MB blob with our own key: it verifies cryptographically…
    const huge = createEvent({ t: 'bulletin', ts: 1, gh: 'aa', msg: 'x'.repeat(1_000_000) }, kp);
    expect(verifyEvent(huge)).toBe(true);
    // …but the shape gate stops it reaching any store.
    expect(isValidEventShape(huge)).toBe(false);
    expect(JSON.stringify(huge).length).toBeGreaterThan(MAX_EVENT_BYTES);
  });

  it('rejects wrong-typed core fields, unknown types, and a bad loc', () => {
    const e = makeCheckin();
    expect(isValidEventShape({ ...e, gh: 12 as never })).toBe(false);
    expect(isValidEventShape({ ...e, ts: 'soon' as never })).toBe(false);
    expect(isValidEventShape({ ...e, ttl: -1 })).toBe(false);
    expect(isValidEventShape({ ...e, t: 'nope' as never })).toBe(false);
    expect(isValidEventShape({ ...e, v: 2 as never })).toBe(false);
    expect(isValidEventShape({ ...e, msg: 42 as never })).toBe(false);
    expect(isValidEventShape({ ...e, loc: [1] as never })).toBe(false);
    expect(isValidEventShape(null as never)).toBe(false);
  });
});

describe('expiry + merge', () => {
  it('reports expiry relative to now', () => {
    const e = makeCheckin({ ttl: 100 });
    expect(isExpired(e, e.ts + 50)).toBe(false);
    expect(isExpired(e, e.ts + 101)).toBe(true);
  });

  it('unions by id and drops duplicates', () => {
    const a = makeCheckin({ ts: 1 });
    const b = makeCheckin({ ts: 2 });
    const merged = unionById([a, b], [a]);
    expect(merged).toHaveLength(2);
    expect(new Set(merged.map((e) => e.id)).size).toBe(2);
  });
});

describe('bulletin trust', () => {
  it('marks a valid bulletin from an unpinned key as unverified', () => {
    const e = createEvent({ t: 'bulletin', ts: 1, gh: 'aa', msg: 'hi' }, kp);
    expect(bulletinTrust(e)).toBe('unverified');
  });

  it('marks a tampered bulletin as invalid', () => {
    const e = createEvent({ t: 'bulletin', ts: 1, gh: 'aa', msg: 'hi' }, kp);
    expect(bulletinTrust({ ...e, msg: 'evil' })).toBe('invalid');
  });
});
