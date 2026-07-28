import { createEvent, FountainDecoder, FountainEncoder, generateKeypair, verifyEvent, type SetuEvent } from '@setu/shared';
import { describe, expect, it } from 'vitest';
import { decodeBundle, encodeBundle, filterForBundle } from './bundle.js';

const kp = generateKeypair();

function sampleEvents(n: number): SetuEvent[] {
  const out: SetuEvent[] = [];
  for (let i = 0; i < n; i++) {
    out.push(
      createEvent(
        {
          t: 'checkin',
          ts: 1_700_000_000 + i,
          gh: i % 2 ? 'wh0r' : 'wh0q',
          st: i % 3 ? 'safe' : 'need',
          n: `ব্যক্তি ${i}`,
          msg: i % 4 === 0 ? 'পানি ও খাবার দরকার — দ্রুত সাহায্য চাই।' : undefined,
        },
        kp,
      ),
    );
  }
  return out;
}

describe('bundle round-trip', () => {
  it('encodes and decodes events losslessly, keeping signatures valid', async () => {
    const events = sampleEvents(24);
    const bytes = await encodeBundle(events);
    const back = await decodeBundle(bytes);
    expect(back).toHaveLength(events.length);
    expect(back).toEqual(events);
    expect(back.every(verifyEvent)).toBe(true);
  });

  it('survives the full beam pipeline: bundle → fountain → lossy → decode', async () => {
    const events = sampleEvents(24); // ~24 events, the acceptance target
    const bytes = await encodeBundle(events);

    const enc = new FountainEncoder(bytes);
    const dec = new FountainDecoder();
    // Drop 40% of frames, feeding each surviving one three times (camera re-reads).
    let esi = 0;
    while (!dec.done && esi < enc.k * 60) {
      if ((esi * 2654435761) % 5 >= 2) {
        const f = enc.frame(esi);
        dec.addFrame(f);
        dec.addFrame(f);
        dec.addFrame(f);
      }
      esi++;
    }
    expect(dec.done).toBe(true);

    const recovered = await decodeBundle(dec.result()!);
    expect(recovered).toEqual(events);
    expect(recovered.every(verifyEvent)).toBe(true);
  });

  it('filters by area and last-24h', () => {
    const now = 1_700_100_000;
    const events: SetuEvent[] = [
      createEvent({ t: 'checkin', ts: now - 10, gh: 'wh0r', st: 'safe' }, kp),
      createEvent({ t: 'checkin', ts: now - 200_000, gh: 'wh0r', st: 'safe' }, kp),
      createEvent({ t: 'checkin', ts: now - 10, gh: 'abcd', st: 'safe' }, kp),
      createEvent({ t: 'checkin', ts: now - 10, gh: '', st: 'safe' }, kp),
    ];
    expect(filterForBundle(events, 'all', 'wh0r', now)).toHaveLength(4);
    expect(filterForBundle(events, 'area', 'wh0r', now)).toHaveLength(2);
    expect(filterForBundle(events, 'day', 'wh0r', now)).toHaveLength(3);
    expect(filterForBundle(events, 'area', '', now)).toHaveLength(0);
  });
});
