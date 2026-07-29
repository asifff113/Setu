import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CHUNK_SIZE,
  FALLBACK_CHUNK_SIZE,
  MAX_BEAM_BYTES,
  FountainDecoder,
  FountainEncoder,
  frameIndices,
  mulberry32,
  parseFrameText,
  readFrame,
} from './fountain.js';

/** Deterministic pseudo-random payload of `len` bytes. */
function makePayload(len: number, seed = 1): Uint8Array {
  const rng = mulberry32(seed);
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = Math.floor(rng() * 256);
  return out;
}

/**
 * Stream frames from `encoder` into a fresh decoder, dropping `dropRate` of them
 * (a lossy camera), until decode completes or we exceed a sane frame budget.
 * Returns the recovered payload plus how many frames the decoder accepted.
 */
function transfer(
  encoder: FountainEncoder,
  dropRate: number,
  dropSeed = 7,
): { result: Uint8Array | null; framesUsed: number } {
  const decoder = new FountainDecoder();
  const drop = mulberry32(dropSeed);
  const budget = Math.max(200, encoder.k * 30);
  let framesUsed = 0;
  for (let esi = 0; esi < budget && !decoder.done; esi++) {
    if (drop() < dropRate) continue; // frame lost in transit
    if (decoder.addFrame(encoder.frame(esi))) framesUsed++;
  }
  return { result: decoder.result(), framesUsed };
}

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(99);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('frameIndices', () => {
  it('is deterministic and in range', () => {
    for (let seed = 0; seed < 200; seed++) {
      const k = 17;
      const a = frameIndices(seed, k);
      const b = frameIndices(seed, k);
      expect(a).toEqual(b);
      expect(new Set(a).size).toBe(a.length); // distinct
      for (const idx of a) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(k);
      }
      expect(a.length).toBeGreaterThanOrEqual(1);
      expect(a.length).toBeLessThanOrEqual(8);
    }
  });

  it('roughly follows the prescribed degree distribution', () => {
    const k = 50;
    const counts = { d1: 0, d2: 0, d3: 0, dHi: 0 };
    const n = 20000;
    for (let seed = 0; seed < n; seed++) {
      const d = frameIndices(seed, k).length;
      if (d === 1) counts.d1++;
      else if (d === 2) counts.d2++;
      else if (d === 3) counts.d3++;
      else counts.dHi++;
    }
    expect(counts.d1 / n).toBeCloseTo(0.4, 1);
    expect(counts.d2 / n).toBeCloseTo(0.3, 1);
    expect(counts.d3 / n).toBeCloseTo(0.2, 1);
    expect(counts.dHi / n).toBeCloseTo(0.1, 1);
  });
});

describe('frame header', () => {
  it('round-trips through readFrame', () => {
    const enc = new FountainEncoder(makePayload(500));
    const bytes = enc.frame(42);
    const parsed = readFrame(bytes);
    expect(parsed).not.toBeNull();
    expect(parsed!.seed).toBe(42);
    expect(parsed!.k).toBe(enc.k);
    expect(parsed!.len).toBe(500);
    expect(parsed!.payload.length).toBe(DEFAULT_CHUNK_SIZE);
  });

  it('rejects non-SB1 / truncated input', () => {
    expect(readFrame(new Uint8Array([1, 2, 3]))).toBeNull();
    expect(readFrame(new Uint8Array(0))).toBeNull();
    const enc = new FountainEncoder(makePayload(100));
    const good = enc.frame(0);
    const corrupt = good.slice();
    corrupt[0] = 0x00; // break the magic
    expect(readFrame(corrupt)).toBeNull();
  });

  it('rejects oversized metadata before decoder allocation', () => {
    const frame = new FountainEncoder(makePayload(100)).frame(0);
    const hugeK = frame.slice();
    new DataView(hugeK.buffer).setUint16(7, 65535, false);
    expect(readFrame(hugeK)).toBeNull();
    const hugeLen = frame.slice();
    new DataView(hugeLen.buffer).setUint32(9, MAX_BEAM_BYTES + 1, false);
    expect(readFrame(hugeLen)).toBeNull();
  });

  it('parseFrameText decodes base64url and ignores non-frames', () => {
    const enc = new FountainEncoder(makePayload(300));
    expect(parseFrameText(enc.frameText(3))).not.toBeNull();
    expect(parseFrameText('https://example.com/not-a-frame')).toBeNull();
    expect(parseFrameText('')).toBeNull();
  });
});

describe('fountain roundtrip', () => {
  it('recovers exactly with no loss', () => {
    const payload = makePayload(2000, 3);
    const enc = new FountainEncoder(payload);
    const { result } = transfer(enc, 0);
    expect(result).not.toBeNull();
    expect(Array.from(result!)).toEqual(Array.from(payload));
  });

  it('recovers after dropping 40% of frames', () => {
    for (const len of [1, 180, 181, 500, 2000, 5000]) {
      const payload = makePayload(len, len);
      const enc = new FountainEncoder(payload);
      const { result } = transfer(enc, 0.4, len);
      expect(result, `len=${len}`).not.toBeNull();
      expect(Array.from(result!), `len=${len}`).toEqual(Array.from(payload));
    }
  });

  it('recovers under heavy 60% loss', () => {
    const payload = makePayload(3000, 11);
    const enc = new FountainEncoder(payload);
    const { result } = transfer(enc, 0.6, 11);
    expect(result).not.toBeNull();
    expect(Array.from(result!)).toEqual(Array.from(payload));
  });

  it('decodes with modest average overhead (~1.5–2x k) over random drop patterns', () => {
    // Overhead varies with which frame-seeds the receiver happens to catch, so
    // a single trajectory is noisy; assert the average over many lossy patterns.
    const payload = makePayload(4000, 5); // ~23 chunks at 180B
    const enc = new FountainEncoder(payload);
    let total = 0;
    const trials = 100;
    for (let trial = 0; trial < trials; trial++) {
      const { result, framesUsed } = transfer(enc, 0.4, 1000 + trial);
      expect(result, `trial ${trial}`).not.toBeNull();
      total += framesUsed / enc.k;
    }
    expect(total / trials).toBeLessThan(2.2);
  });

  it('works with the fallback chunk size', () => {
    const payload = makePayload(2500, 8);
    const enc = new FountainEncoder(payload, FALLBACK_CHUNK_SIZE);
    const { result } = transfer(enc, 0.4, 8);
    expect(result).not.toBeNull();
    expect(Array.from(result!)).toEqual(Array.from(payload));
  });

  it('ignores duplicate frames (camera re-reads the same QR)', () => {
    const payload = makePayload(1000, 2);
    const enc = new FountainEncoder(payload);
    const decoder = new FountainDecoder();
    // Feed each frame three times, as a 30fps camera does with a 7fps QR.
    for (let esi = 0; esi < enc.k * 3 && !decoder.done; esi++) {
      const bytes = enc.frame(esi);
      decoder.addFrame(bytes);
      expect(decoder.addFrame(bytes)).toBe(false); // duplicate seed
      expect(decoder.addFrame(bytes)).toBe(false);
    }
    expect(decoder.done).toBe(true);
    expect(Array.from(decoder.result()!)).toEqual(Array.from(payload));
  });

  it('resets cleanly when the payload changes mid-stream', () => {
    const first = makePayload(800, 1);
    const second = makePayload(1600, 2);
    const decoder = new FountainDecoder();
    const encA = new FountainEncoder(first);
    // Partially transfer the first payload…
    for (let esi = 0; esi < 3; esi++) decoder.addFrame(encA.frame(esi));
    // …then switch to a different, larger payload; decoder must retarget.
    const encB = new FountainEncoder(second);
    for (let esi = 0; esi < encB.k * 4 && !decoder.done; esi++) {
      decoder.addFrame(encB.frame(esi));
    }
    expect(decoder.done).toBe(true);
    expect(Array.from(decoder.result()!)).toEqual(Array.from(second));
  });
});
