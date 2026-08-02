import { createEvent, generateKeypair, type SetuEvent } from '@setu/shared';
import { describe, expect, it } from 'vitest';
import {
  decodePosterPayload,
  encodePosterPayload,
  MAX_POSTER_CHARS,
  POSTER_PREFIX,
} from './poster';

const kp = generateKeypair();

function sampleEvents(n: number): SetuEvent[] {
  const out: SetuEvent[] = [];
  for (let i = 0; i < n; i++) {
    out.push(
      createEvent(
        {
          t: 'checkin',
          ts: 1_700_000_000 + i,
          gh: 'wh0r',
          st: 'safe',
          n: `Person ${i}`,
          msg: 'Detailed crisis situation message with extra context to occupy space.',
        },
        kp,
      ),
    );
  }
  return out;
}

describe('poster payload codec & trimming', () => {
  it('roundtrips small event sets with SETU1: prefix', async () => {
    const events = sampleEvents(5);
    const { payload, count } = await encodePosterPayload(events);

    expect(count).toBe(5);
    expect(payload.startsWith(POSTER_PREFIX)).toBe(true);
    expect(payload.length).toBeLessThanOrEqual(MAX_POSTER_CHARS);

    const decoded = await decodePosterPayload(payload);
    expect(decoded).toHaveLength(5);
  });

  it('trims oversized event sets to fit within MAX_POSTER_CHARS budget', async () => {
    const largeSet = sampleEvents(80);
    const { payload, count } = await encodePosterPayload(largeSet);

    expect(payload.length).toBeLessThanOrEqual(MAX_POSTER_CHARS);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(80);

    const decoded = await decodePosterPayload(payload);
    expect(decoded).toHaveLength(count);
  });
});
