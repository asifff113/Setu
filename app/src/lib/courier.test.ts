import { describe, expect, it } from 'vitest';
import { processCourierQueue } from './courier';

describe('courier', () => {
  it('returns 0 on non-native platform', async () => {
    const added = await processCourierQueue();
    expect(added).toBe(0);
  });
});
