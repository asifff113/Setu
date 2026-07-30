import { describe, expect, it } from 'vitest';
import { AREAS, DISTRICTS } from './areas.js';

describe('AREAS', () => {
  it('exposes all 64 districts separately from optional city/thana entries', () => {
    expect(DISTRICTS).toHaveLength(64);
    expect(new Set(DISTRICTS.map((area) => area.code)).size).toBe(64);
  });

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
