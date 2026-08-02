// Must be first: the Dexie db singleton captures IndexedDB at module load.
import 'fake-indexeddb/auto';

import { createEvent, generateKeypair, type SetuEvent } from '@setu/shared';
import { describe, expect, it } from 'vitest';
import { encodeBundle } from './bundle';
import { processSharedBundle } from './shareReceive';

const kp = generateKeypair();

function sampleEvents(n: number): SetuEvent[] {
  // Recent timestamps — ingestEvents drops events older than their TTL.
  const now = Math.floor(Date.now() / 1000);
  const out: SetuEvent[] = [];
  for (let i = 0; i < n; i++) {
    out.push(
      createEvent(
        {
          t: 'checkin',
          ts: now - n + i,
          gh: 'wh0r',
          st: 'safe',
          n: `User ${i}`,
        },
        kp,
      ),
    );
  }
  return out;
}

describe('processSharedBundle', () => {
  it('decodes and ingests events from a stashed bundle', async () => {
    const events = sampleEvents(3);
    const bundleBytes = await encodeBundle(events);

    const result = await processSharedBundle(async () => bundleBytes);
    expect(result).not.toBeNull();
    expect(result?.added).toBe(3);
    expect(result?.rejected).toBe(0);

    // Re-ingest should mark them as known
    const result2 = await processSharedBundle(async () => bundleBytes);
    expect(result2?.known).toBe(3);
    expect(result2?.added).toBe(0);
  });

  it('returns null for empty or invalid bytes', async () => {
    const result = await processSharedBundle(async () => new Uint8Array([1, 2, 3]));
    expect(result).toBeNull();
  });
});
