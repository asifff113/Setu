import {
  createEvent,
  findAreaByCode,
  findAreaByGh,
  generateKeypair,
  type NewEventInput,
  type SetuEvent,
} from '@setu/shared';
import { describe, expect, it } from 'vitest';
import { areaCounts, buildMapMarkers } from './mapMarkers.js';

const kp = generateKeypair();
const other = generateKeypair();

function ev(input: NewEventInput, keypair = kp): SetuEvent {
  return createEvent(input, keypair);
}

// A known-resolvable geohash. Several Dhaka-area seeds sit in the same
// precision-4 cell (~39km x ~19.5km), so don't assume this resolves back to
// "mirpur" specifically — always compare against findAreaByGh's own answer.
const MIRPUR_GH = findAreaByCode('mirpur')!.gh;

describe('buildMapMarkers', () => {
  it('plots a checkin at its attached GPS location', () => {
    const e = ev({ t: 'checkin', ts: 1, gh: MIRPUR_GH, st: 'safe', loc: [23.8, 90.4] });
    const [marker] = buildMapMarkers([e]);
    expect(marker).toMatchObject({ id: e.id, lat: 23.8, lng: 90.4, color: 'safe' });
  });

  it('falls back to a jittered area centroid when no GPS is attached', () => {
    const e = ev({ t: 'help', ts: 1, gh: MIRPUR_GH, st: 'need', cat: 'water' });
    const [marker] = buildMapMarkers([e]);
    const resolved = findAreaByGh(MIRPUR_GH)!;
    expect(marker).toBeDefined();
    expect(marker!.color).toBe('need');
    // Within a small jitter radius of whichever seed centroid this gh resolves to.
    expect(Math.abs(marker!.lat - resolved.lat)).toBeLessThan(0.05);
    expect(Math.abs(marker!.lng - resolved.lng)).toBeLessThan(0.05);
  });

  it('drops events with neither GPS nor a resolvable area', () => {
    const e = ev({ t: 'checkin', ts: 1, gh: '', st: 'safe' });
    expect(buildMapMarkers([e])).toHaveLength(0);
  });

  it('is stable across repeated calls (same id -> same jittered position)', () => {
    const e = ev({ t: 'checkin', ts: 1, gh: MIRPUR_GH, st: 'safe' });
    const a = buildMapMarkers([e])[0]!;
    const b = buildMapMarkers([e])[0]!;
    expect(a.lat).toBe(b.lat);
    expect(a.lng).toBe(b.lng);
  });

  it('colors missing red and found/seen green', () => {
    const missing = ev({ t: 'person', ts: 1, gh: MIRPUR_GH, pn: 'Karim', pst: 'missing' });
    const found = ev(
      { t: 'person', ts: 2, gh: MIRPUR_GH, pn: 'Rahim', pst: 'found' },
      other,
    );
    const markers = buildMapMarkers([missing, found]);
    expect(markers.find((m) => m.id === missing.id)?.color).toBe('need');
    expect(markers.find((m) => m.id === found.id)?.color).toBe('safe');
  });

  it('only plots the latest per person, not every historical event', () => {
    const a = ev({ t: 'checkin', ts: 1, gh: MIRPUR_GH, st: 'safe' });
    const b = ev({ t: 'help', ts: 2, gh: MIRPUR_GH, st: 'need', cat: 'food' });
    const markers = buildMapMarkers([a, b]);
    expect(markers).toHaveLength(1);
    expect(markers[0]?.id).toBe(b.id);
  });

  it('never plots bulletins', () => {
    const bulletin = ev({ t: 'bulletin', ts: 1, gh: MIRPUR_GH, msg: 'shelter open' });
    expect(buildMapMarkers([bulletin])).toHaveLength(0);
  });
});

describe('areaCounts', () => {
  it('counts plottable events per area, sorted highest first', () => {
    const events = [
      ev({ t: 'checkin', ts: 1, gh: MIRPUR_GH, st: 'safe' }, kp),
      ev({ t: 'checkin', ts: 1, gh: MIRPUR_GH, st: 'safe' }, other),
      ev({ t: 'person', ts: 1, gh: '', pn: 'X', pst: 'missing' }, kp),
    ];
    const counts = areaCounts(events);
    expect(counts[0]).toEqual({ gh: MIRPUR_GH, count: 2 });
    expect(counts[1]).toEqual({ gh: '', count: 1 });
  });
});
