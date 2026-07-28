import { describe, expect, it } from 'vitest';
import { AREAS } from './areas.js';

describe('AREAS', () => {
  it('has a unique geohash per area (no two named areas share a gh bucket)', () => {
    const byGh = new Map<string, string[]>();
    for (const area of AREAS) {
      const names = byGh.get(area.gh) ?? [];
      names.push(area.code);
      byGh.set(area.gh, names);
    }
    const collisions = [...byGh.entries()].filter(([, codes]) => codes.length > 1);
    expect(collisions, `colliding areas: ${JSON.stringify(collisions)}`).toHaveLength(0);
  });
});
