import { describe, expect, it } from 'vitest';
import type { SetuEvent } from '@setu/shared';
import { chunkEventsForBackup } from './backup';

describe('backup chunking', () => {
  it('returns empty array when events array is empty', () => {
    expect(chunkEventsForBackup([])).toEqual([]);
  });

  it('correctly chunks 5001 events into 2 files (newest-first)', () => {
    const events: SetuEvent[] = Array.from({ length: 5001 }, (_, i) => ({
      id: `e_${i}`,
      author: 'a_author',
      created_at: 1000 + i,
      kind: 'safe',
      payload: { name: 'User', text: `Event ${i}` },
      sig: 'sig_test',
    }));

    const chunks = chunkEventsForBackup(events, 5000);
    expect(chunks.length).toBe(2);
    expect(chunks[0].length).toBe(5000);
    expect(chunks[1].length).toBe(1);

    // Newest event should be first in chunk 0
    expect(chunks[0][0].created_at).toBe(6000); // 1000 + 5000
    // Oldest event should be in chunk 1
    expect(chunks[1][0].created_at).toBe(1000);
  });
});
