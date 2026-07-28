import { describe, expect, it } from 'vitest';
import { createEvent, type NewEventInput } from './codec.js';
import { generateKeypair } from './crypto.js';
import type { SetuEvent } from './types.js';
import { bulletinEvents, latestPersonEvents, latestStatusEvents } from './views.js';

const kp = generateKeypair();
const other = generateKeypair();

function ev(input: NewEventInput, keypair = kp): SetuEvent {
  return createEvent(input, keypair);
}

describe('latestStatusEvents', () => {
  it('picks the newest checkin/help per author', () => {
    const a = ev({ t: 'checkin', ts: 1, gh: 'wh0r', st: 'safe' });
    const b = ev({ t: 'help', ts: 2, gh: 'wh0r', st: 'need', cat: 'water' });
    const result = latestStatusEvents([a, b]);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(b.id);
  });

  it('keeps different authors separate', () => {
    const a = ev({ t: 'checkin', ts: 1, gh: 'wh0r', st: 'safe' }, kp);
    const b = ev({ t: 'checkin', ts: 1, gh: 'wh0r', st: 'safe' }, other);
    expect(latestStatusEvents([a, b])).toHaveLength(2);
  });

  it('groups sms-sourced events by name+area instead of author', () => {
    // Both "sent" by the same relay author key but distinct phone senders.
    const a = ev({ t: 'checkin', ts: 1, gh: 'wh0r', st: 'safe', n: 'Rahim', src: 'sms' });
    const b = ev({ t: 'checkin', ts: 2, gh: 'wh0r', st: 'safe', n: 'Karim', src: 'sms' });
    expect(latestStatusEvents([a, b])).toHaveLength(2);
  });

  it('ignores person and bulletin events', () => {
    const p = ev({ t: 'person', ts: 1, gh: 'wh0r', pn: 'X', pst: 'missing' });
    const bul = ev({ t: 'bulletin', ts: 1, gh: 'wh0r', msg: 'hi' });
    expect(latestStatusEvents([p, bul])).toHaveLength(0);
  });

  it('picks the same winner regardless of array order when ts ties (convergence)', () => {
    // Same whole-second ts is common (quick double-tap, replayed merge); every
    // device must derive the identical "latest" from the identical event set.
    const a = ev({ t: 'checkin', ts: 5, gh: 'wh0r', st: 'safe' });
    const b = ev({ t: 'help', ts: 5, gh: 'wh0r', st: 'need', cat: 'water' });
    const forward = latestStatusEvents([a, b])[0]?.id;
    const backward = latestStatusEvents([b, a])[0]?.id;
    expect(forward).toBe(backward);
  });
});

describe('latestPersonEvents', () => {
  it('lets a newer found supersede an older missing report', () => {
    const missing = ev({ t: 'person', ts: 1, gh: 'wh0r', pn: 'Karim', pst: 'missing' });
    const found = ev({ t: 'person', ts: 2, gh: 'wh0r', pn: 'Karim', pst: 'found' });
    const result = latestPersonEvents([missing, found]);
    expect(result).toHaveLength(1);
    expect(result[0]?.pst).toBe('found');
  });

  it('is case/whitespace-insensitive on the name key', () => {
    const a = ev({ t: 'person', ts: 1, gh: 'wh0r', pn: 'Karim', pst: 'missing' });
    const b = ev({ t: 'person', ts: 2, gh: 'wh0r', pn: ' karim ', pst: 'found' });
    expect(latestPersonEvents([a, b])).toHaveLength(1);
  });

  it('keeps different areas separate', () => {
    const a = ev({ t: 'person', ts: 1, gh: 'wh0r', pn: 'Karim', pst: 'missing' });
    const b = ev({ t: 'person', ts: 1, gh: 'zzzz', pn: 'Karim', pst: 'missing' });
    expect(latestPersonEvents([a, b])).toHaveLength(2);
  });
});

describe('bulletinEvents', () => {
  it('returns every bulletin, newest first, ungrouped', () => {
    const a = ev({ t: 'bulletin', ts: 1, gh: 'wh0r', msg: 'first' });
    const b = ev({ t: 'bulletin', ts: 2, gh: 'wh0r', msg: 'second' });
    expect(bulletinEvents([a, b]).map((e) => e.id)).toEqual([b.id, a.id]);
  });
});
