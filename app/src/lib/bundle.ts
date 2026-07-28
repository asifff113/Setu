/**
 * Event bundle codec — the payload format shared by QR Beam and the export/import
 * file transport. A bundle is `gzip(CBOR(SetuEvent[]))`: CBOR keeps it compact
 * (short keys, binary), gzip squeezes the CBOR, and the result is what the
 * fountain encoder chunks into QR frames or what we hand to the OS as a `.setu`
 * file. Decoding never trusts the bytes — the caller runs every event back
 * through `ingestEvents`, which verifies signatures before anything is stored.
 *
 * gzip uses the platform CompressionStream (browsers + Node 18+); no pako, no
 * added bundle weight.
 */
import type { SetuEvent } from '@setu/shared';
import { Decoder, Encoder } from 'cbor-x';

// records:false keeps the CBOR structurally plain (no cbor-x structure tags), so
// a bundle written on one device decodes on any other.
const encoder = new Encoder({ useRecords: false, variableMapSize: true });
const decoder = new Decoder({ useRecords: false });

/** Drain a ReadableStream of bytes into one Uint8Array. */
async function drain(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      parts.push(value);
      total += value.length;
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

async function pipeThrough(
  bytes: Uint8Array,
  transform: CompressionStream | DecompressionStream,
): Promise<Uint8Array> {
  const writer = transform.writable.getWriter();
  // Cast at the boundary: our buffers are always ArrayBuffer-backed, but TS 5.7
  // widens Uint8Array to ArrayBufferLike (which BufferSource excludes).
  void writer.write(bytes as BufferSource);
  void writer.close();
  return drain(transform.readable as ReadableStream<Uint8Array>);
}

/** gzip → CBOR → events. Returns the compressed bundle ready to beam or save. */
export async function encodeBundle(events: SetuEvent[]): Promise<Uint8Array> {
  const cbor = encoder.encode(events) as Uint8Array;
  return pipeThrough(cbor, new CompressionStream('gzip'));
}

/**
 * Inverse of {@link encodeBundle}: gunzip + CBOR-decode into events. The events
 * are unverified — feed them to `ingestEvents`. Returns [] for empty/garbled
 * bundles rather than throwing.
 */
export async function decodeBundle(bytes: Uint8Array): Promise<SetuEvent[]> {
  const cbor = await pipeThrough(bytes, new DecompressionStream('gzip'));
  const decoded: unknown = decoder.decode(cbor);
  return Array.isArray(decoded) ? (decoded as SetuEvent[]) : [];
}

/** Which slice of the local log to put in a bundle. */
export type BundleFilter = 'all' | 'area' | 'day';

const DAY_SECONDS = 86_400;

/**
 * Filter events for an export/beam bundle: everything, just my area (geohash
 * prefix match), or just the last 24h. Empty `gh` means "unknown area", which
 * only the `all` filter includes.
 */
export function filterForBundle(
  events: SetuEvent[],
  filter: BundleFilter,
  myGh: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): SetuEvent[] {
  if (filter === 'area') {
    if (!myGh) return [];
    return events.filter((e) => e.gh !== '' && e.gh.startsWith(myGh));
  }
  if (filter === 'day') {
    return events.filter((e) => e.ts >= nowSeconds - DAY_SECONDS);
  }
  return events;
}
