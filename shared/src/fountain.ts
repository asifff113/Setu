/**
 * Luby-transform (LT) fountain codec — the engine behind QR Beam, the one-way
 * screen→camera bulk transfer that moves events with zero network.
 *
 * The sender turns a payload (a gzipped event bundle) into `k` fixed-size source
 * chunks and then emits an *endless* stream of coded frames, each an XOR of a
 * seed-chosen subset of chunks. Because the stream is infinite and rateless, a
 * camera that misses or misreads frames just keeps watching until enough arrive
 * — no handshake, no retransmit, no back-channel. The receiver peels the coded
 * frames back into the original chunks (belief propagation) and stops the moment
 * all `k` are recovered, typically after ~1.3–1.8× k frames.
 *
 * Frame wire format (big-endian), then base64url'd for the QR text layer:
 *   magic 'SB1' (3B) | seed u32 (4B) | k u16 (2B) | len u32 (4B) | payload (chunkSize B)
 *
 * `seed` fully determines a frame's degree and chunk indices via `mulberry32`,
 * so encoder and decoder derive the exact same subset from the seed alone —
 * nothing else about the combination travels on the wire. `k` lets the receiver
 * size its symbol table from the first frame; `len` trims the final chunk's
 * zero padding after reassembly. This module is pure (no DOM, no crypto): gzip
 * and signature verification live at the app boundary that feeds/drains it.
 */
import { fromBase64url, toBase64url } from './base64.js';

/** Default source-chunk size in bytes — ~193B/frame, a comfortably scannable QR. */
export const DEFAULT_CHUNK_SIZE = 180;
/** Fallback chunk size when decoding is poor (smaller/denser payload, easier QR). */
export const FALLBACK_CHUNK_SIZE = 120;

// 'SB1' magic + fixed-width header fields.
const MAGIC_0 = 0x53; // 'S'
const MAGIC_1 = 0x42; // 'B'
const MAGIC_2 = 0x31; // '1'
const HEADER_SIZE = 13;

/**
 * mulberry32 — a tiny, fast, fully-deterministic 32-bit PRNG. Identical output
 * on every device for a given seed, which is what lets the decoder reconstruct a
 * frame's chunk selection from the seed alone.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Degree distribution (per spec): 40% d=1, 30% d=2, 20% d=3, 10% d=4–8. The
 * heavy degree-1 mass bootstraps peeling for the small `k` a QR bundle produces;
 * the tail keeps enough mixing to resolve the rest. Clamped to `k`.
 */
function sampleDegree(rng: () => number, k: number): number {
  const x = rng();
  let d: number;
  if (x < 0.4) d = 1;
  else if (x < 0.7) d = 2;
  else if (x < 0.9) d = 3;
  else d = 4 + Math.floor(rng() * 5); // 4,5,6,7,8 uniform
  return Math.min(d, k);
}

/** Pick `d` distinct chunk indices in [0, k) from the same PRNG stream. */
function sampleDistinct(rng: () => number, k: number, d: number): number[] {
  const chosen = new Set<number>();
  while (chosen.size < d) {
    chosen.add(Math.floor(rng() * k) % k);
  }
  return [...chosen];
}

/**
 * Deterministically derive a frame's source-chunk indices from `(seed, k)`.
 * Encoder and decoder both call this, so the XOR combination never needs to be
 * transmitted — only the seed does.
 */
export function frameIndices(seed: number, k: number): number[] {
  const rng = mulberry32(seed >>> 0);
  const d = sampleDegree(rng, k);
  return sampleDistinct(rng, k, d);
}

/** XOR `src` into `target` in place over their common length. */
function xorInto(target: Uint8Array, src: Uint8Array): void {
  const n = Math.min(target.length, src.length);
  for (let i = 0; i < n; i++) target[i]! ^= src[i]!;
}

/** First element of a non-empty set (avoids iterator-result narrowing noise). */
function firstOf(set: Set<number>): number {
  for (const v of set) return v;
  return -1; // unreachable while size >= 1
}

/** Serialize one coded frame to its binary wire form (header + payload). */
function writeFrame(
  seed: number,
  k: number,
  len: number,
  payload: Uint8Array,
): Uint8Array {
  const out = new Uint8Array(HEADER_SIZE + payload.length);
  const dv = new DataView(out.buffer);
  out[0] = MAGIC_0;
  out[1] = MAGIC_1;
  out[2] = MAGIC_2;
  dv.setUint32(3, seed >>> 0, false);
  dv.setUint16(7, k, false);
  dv.setUint32(9, len >>> 0, false);
  out.set(payload, HEADER_SIZE);
  return out;
}

/** A parsed coded frame. `payload` is a private copy the decoder may mutate. */
export interface ParsedFrame {
  seed: number;
  k: number;
  len: number;
  payload: Uint8Array;
}

/**
 * Parse + validate a binary frame. Returns null for anything that isn't a
 * well-formed 'SB1' frame — the receiver scans arbitrary QR codes, so garbage in
 * is expected and must be rejected, not thrown on.
 */
export function readFrame(bytes: Uint8Array): ParsedFrame | null {
  if (bytes.length <= HEADER_SIZE) return null;
  if (bytes[0] !== MAGIC_0 || bytes[1] !== MAGIC_1 || bytes[2] !== MAGIC_2) {
    return null;
  }
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const seed = dv.getUint32(3, false);
  const k = dv.getUint16(7, false);
  const len = dv.getUint32(9, false);
  if (k < 1) return null;
  // Copy the payload so the decoder can XOR in place without touching the input.
  const payload = bytes.slice(HEADER_SIZE);
  return { seed, k, len, payload };
}

/** Decode a base64url QR string to a validated frame, or null if it isn't one. */
export function parseFrameText(text: string): ParsedFrame | null {
  let bytes: Uint8Array;
  try {
    bytes = fromBase64url(text);
  } catch {
    return null;
  }
  return readFrame(bytes);
}

/**
 * Splits a payload into `k` fixed chunks and emits an endless rateless stream of
 * coded frames. Deterministic: `frame(i)` always yields the same bytes, so the
 * caller owns the frame counter and can restart at will.
 */
export class FountainEncoder {
  readonly chunkSize: number;
  readonly len: number;
  readonly k: number;
  private readonly chunks: Uint8Array[];

  constructor(payload: Uint8Array, chunkSize: number = DEFAULT_CHUNK_SIZE) {
    this.chunkSize = chunkSize;
    this.len = payload.length;
    this.k = Math.max(1, Math.ceil(payload.length / chunkSize));
    this.chunks = [];
    for (let i = 0; i < this.k; i++) {
      const chunk = new Uint8Array(chunkSize); // zero-padded tail
      chunk.set(payload.subarray(i * chunkSize, (i + 1) * chunkSize));
      this.chunks.push(chunk);
    }
  }

  /** Binary coded frame for encoding-symbol-id `esi` (used as the seed). */
  frame(esi: number): Uint8Array {
    const seed = esi >>> 0;
    const payload = new Uint8Array(this.chunkSize);
    for (const idx of frameIndices(seed, this.k)) {
      xorInto(payload, this.chunks[idx]!);
    }
    return writeFrame(seed, this.k, this.len, payload);
  }

  /** base64url text of `frame(esi)` — the exact string to render as a QR. */
  frameText(esi: number): string {
    return toBase64url(this.frame(esi));
  }
}

/** A coded frame reduced against known symbols but still degree ≥ 2. */
interface PendingCheck {
  indices: Set<number>;
  data: Uint8Array;
}

/**
 * Collects coded frames and peels them back into the original payload by belief
 * propagation: degree-1 frames resolve a symbol directly, which is then XOR'd
 * out of every pending frame, cascading until nothing more resolves. Feed frames
 * until `done`, then read `result()`.
 */
export class FountainDecoder {
  private k_: number | null = null;
  private len = 0;
  private chunkSize = 0;
  private symbols: Array<Uint8Array | null> = [];
  private pending: PendingCheck[] = [];
  private readonly resolveQ: number[] = [];
  private readonly seenSeeds = new Set<number>();
  private recovered_ = 0;
  private framesSeen_ = 0;

  /** Number of source chunks, known once the first valid frame arrives. */
  get k(): number | null {
    return this.k_;
  }
  /** Source chunks recovered so far. */
  get recovered(): number {
    return this.recovered_;
  }
  /** Distinct valid frames ingested (a rough "how much have I seen" gauge). */
  get framesSeen(): number {
    return this.framesSeen_;
  }
  /** True once every source chunk has been peeled out. */
  get done(): boolean {
    return this.k_ !== null && this.recovered_ === this.k_;
  }

  private init(frame: ParsedFrame): void {
    this.k_ = frame.k;
    this.len = frame.len;
    this.chunkSize = frame.payload.length;
    this.symbols = new Array<Uint8Array | null>(frame.k).fill(null);
    this.pending = [];
    this.resolveQ.length = 0;
    this.seenSeeds.clear();
    this.recovered_ = 0;
    this.framesSeen_ = 0;
  }

  /**
   * Ingest one binary frame. Returns true if it was a valid, not-yet-seen frame
   * that we processed. If the frame describes a different payload (e.g. the
   * sender switched to the fallback chunk size), the decoder resets to it.
   */
  addFrame(bytes: Uint8Array): boolean {
    const frame = readFrame(bytes);
    if (!frame) return false;

    if (this.k_ === null) {
      this.init(frame);
    } else if (
      frame.k !== this.k_ ||
      frame.len !== this.len ||
      frame.payload.length !== this.chunkSize
    ) {
      // A different bundle/settings mid-stream: start over on the new one.
      this.init(frame);
    }

    if (this.seenSeeds.has(frame.seed)) return false;
    this.seenSeeds.add(frame.seed);
    this.framesSeen_++;
    if (this.done) return true;

    // Reduce the incoming frame against already-known symbols.
    const remaining = new Set<number>();
    const data = frame.payload;
    for (const idx of frameIndices(frame.seed, this.k_!)) {
      const known = this.symbols[idx];
      if (known) xorInto(data, known);
      else remaining.add(idx);
    }

    if (remaining.size === 0) return true; // fully redundant
    if (remaining.size === 1) {
      this.recover(firstOf(remaining), data);
      this.propagate();
    } else {
      this.pending.push({ indices: remaining, data });
    }
    return true;
  }

  /**
   * Ingest a base64url QR string (the receiver's hot path). Non-frame or
   * malformed strings are ignored — the camera scans plenty that aren't ours.
   */
  addFrameText(text: string): boolean {
    let bytes: Uint8Array;
    try {
      bytes = fromBase64url(text);
    } catch {
      return false;
    }
    return this.addFrame(bytes);
  }

  private recover(idx: number, data: Uint8Array): void {
    if (this.symbols[idx] !== null) return;
    this.symbols[idx] = data;
    this.recovered_++;
    this.resolveQ.push(idx);
  }

  /** Cascade newly-recovered symbols through the pending checks. */
  private propagate(): void {
    while (this.resolveQ.length > 0) {
      const idx = this.resolveQ.pop()!;
      const sym = this.symbols[idx];
      if (!sym) continue;
      const next: PendingCheck[] = [];
      for (const check of this.pending) {
        if (!check.indices.has(idx)) {
          next.push(check);
          continue;
        }
        xorInto(check.data, sym);
        check.indices.delete(idx);
        if (check.indices.size === 1) {
          this.recover(firstOf(check.indices), check.data);
        } else if (check.indices.size > 1) {
          next.push(check);
        }
        // size 0 → redundant, drop
      }
      this.pending = next;
    }
  }

  /**
   * The reassembled payload once `done`, trimmed to the original length; null
   * while any chunk is still missing.
   */
  result(): Uint8Array | null {
    if (!this.done) return null;
    const out = new Uint8Array(this.k_! * this.chunkSize);
    for (let i = 0; i < this.k_!; i++) {
      const sym = this.symbols[i];
      if (!sym) return null;
      out.set(sym, i * this.chunkSize);
    }
    return out.subarray(0, this.len);
  }
}
