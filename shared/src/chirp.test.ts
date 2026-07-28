import { describe, expect, it } from 'vitest';
import { MAX_CHIRP_BYTES, ChirpError, decodeChirpEvent, encodeChirpEvent } from './chirp.js';
import { createEvent, verifyEvent, type NewEventInput } from './codec.js';
import { generateKeypair } from './crypto.js';
import { DEFAULT_TTL_SECONDS, type SetuEvent } from './types.js';

const kp = generateKeypair();

function make(overrides: Partial<NewEventInput> = {}): SetuEvent {
  const input: NewEventInput = {
    t: 'checkin',
    ts: 1_753_000_000,
    gh: 'w5cg8n',
    st: 'safe',
    n: 'রহিম উদ্দিন',
    ...overrides,
  };
  return createEvent(input, kp);
}

/** A frame decodes back into an event that (a) verifies and (b) equals the original. */
function expectRoundTrip(event: SetuEvent): Uint8Array {
  const frame = encodeChirpEvent(event);
  const decoded = decodeChirpEvent(frame);
  expect(verifyEvent(decoded)).toBe(true);
  expect(decoded.id).toBe(event.id);
  expect(decoded).toEqual(event);
  return frame;
}

describe('chirp round-trip', () => {
  it('round-trips a safe check-in and it still verifies', () => {
    expectRoundTrip(make());
  });

  it('round-trips help / person / bulletin events', () => {
    expectRoundTrip(createEvent({ t: 'help', ts: 1_753_000_001, gh: 'w5cg8n', st: 'need', cat: 'water', n: 'করিম' }, kp));
    expectRoundTrip(createEvent({ t: 'person', ts: 1_753_000_002, gh: 'w5cg8n', pn: 'সালমা', pst: 'missing' }, kp));
    expectRoundTrip(createEvent({ t: 'bulletin', ts: 1_753_000_003, gh: 'w5cg8n', msg: 'Shelter open' }, kp));
  });

  it('round-trips an unknown-area check-in (empty geohash)', () => {
    expectRoundTrip(make({ gh: '' }));
  });

  it('round-trips a check-in with no display name', () => {
    expectRoundTrip(make({ n: undefined }));
  });

  it('round-trips a non-default ttl', () => {
    expect(DEFAULT_TTL_SECONDS).not.toBe(3600);
    expectRoundTrip(make({ ttl: 3600 }));
  });

  it('round-trips 3-decimal coordinates exactly', () => {
    expectRoundTrip(
      createEvent(
        { t: 'help', ts: 1_753_000_004, gh: 'w5cg8n', st: 'need', cat: 'rescue', loc: [23.751, 90.394] },
        kp,
      ),
    );
  });
});

describe('chirp size', () => {
  it('keeps a realistic check-in within ggwave budget', () => {
    const frame = encodeChirpEvent(make());
    expect(frame.length).toBeLessThanOrEqual(MAX_CHIRP_BYTES);
    // Sanity: the 32-byte au + 64-byte sig floor plus a little framing.
    expect(frame.length).toBeGreaterThan(96);
  });

  it('may exceed the budget for a fat event — caller must check', () => {
    const fat = createEvent(
      { t: 'help', ts: 1, gh: 'w5cg8n', st: 'need', cat: 'med', n: 'রহিম উদ্দিন', msg: 'অনেক বড় একটি বার্তা যা শব্দে পাঠানো যাবে না কারণ এটি সীমার বাইরে চলে যায়' },
      kp,
    );
    expect(encodeChirpEvent(fat).length).toBeGreaterThan(MAX_CHIRP_BYTES);
  });
});

describe('chirp refusals', () => {
  it('refuses sms-sourced events (no author signature to carry)', () => {
    const smsish: SetuEvent = { ...make(), src: 'sms' };
    expect(() => encodeChirpEvent(smsish)).toThrow(ChirpError);
  });
});

describe('chirp decode rejects garbage', () => {
  it('rejects a frame with a foreign header (not a Setu chirp)', () => {
    expect(() => decodeChirpEvent(new Uint8Array([0x00, 0x00, 1, 2, 3]))).toThrow(ChirpError);
  });

  it('rejects a truncated frame', () => {
    const frame = encodeChirpEvent(make());
    expect(() => decodeChirpEvent(frame.subarray(0, frame.length - 10))).toThrow(ChirpError);
  });

  it('surfaces a flipped signature byte as a failed verification', () => {
    const frame = encodeChirpEvent(make());
    const tampered = frame.slice();
    // Last 64 bytes are the signature; corrupt one of them.
    tampered[tampered.length - 1] ^= 0xff;
    // Structurally still a valid frame, but the signature no longer verifies.
    expect(verifyEvent(decodeChirpEvent(tampered))).toBe(false);
  });

  it('surfaces a flipped author byte as a failed verification', () => {
    const frame = encodeChirpEvent(make());
    const tampered = frame.slice();
    // au sits just after header(1) + mask(1) + ts(4) + gh(1 len + 6). Flip inside it.
    tampered[14] ^= 0xff;
    const decoded = decodeChirpEvent(tampered);
    expect(verifyEvent(decoded)).toBe(false);
  });
});
