import { describe, expect, it } from 'vitest';
import type { SetuEvent } from '@setu/shared';
import { chunkEventsForBackup } from './backup';

function makeEvent(i: number): SetuEvent {
  return {
    v: 1,
    t: 'checkin',
    id: `e_${i}`,
    ts: 1000 + i,
    ttl: 259200,
    gh: 'wh0r8',
    au: 'a_author',
    n: 'User',
    st: 'safe',
    msg: `Event ${i}`,
    sig: 'sig_test',
  };
}

describe('backup chunking', () => {
  it('returns empty array when events array is empty', () => {
    expect(chunkEventsForBackup([])).toEqual([]);
  });

  it('correctly chunks 5001 events into 2 files (newest-first)', () => {
    const events: SetuEvent[] = Array.from({ length: 5001 }, (_, i) => makeEvent(i));

    const chunks = chunkEventsForBackup(events, 5000);
    expect(chunks.length).toBe(2);
    expect(chunks[0]!.length).toBe(5000);
    expect(chunks[1]!.length).toBe(1);

    // Newest event should be first in chunk 0
    expect(chunks[0]![0]!.ts).toBe(6000); // 1000 + 5000
    // Oldest event should be in chunk 1
    expect(chunks[1]![0]!.ts).toBe(1000);
  });
});
