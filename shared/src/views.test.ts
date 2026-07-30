import { describe, expect, it } from 'vitest';
import { createEvent, type NewEventInput } from './codec.js';
import { generateKeypair } from './crypto.js';
import type { SetuEvent } from './types.js';
import {
  bulletinEvents,
  chatEvents,
  latestPersonEvents,
  latestStatusEvents,
  threadFor,
  validRetractionIds,
} from './views.js';

const kp = generateKeypair();
const other = generateKeypair();

function ev(input: NewEventInput, keypair = kp): SetuEvent {
  return createEvent(input, keypair);
}

describe('latestStatusEvents', () => {
  it('keeps each help event as a case while retaining the latest check-in', () => {
    const a = ev({ t: 'checkin', ts: 1, gh: 'wh0r', st: 'safe' });
    const b = ev({ t: 'help', ts: 2, gh: 'wh0r', st: 'need', cat: 'water' });
    const result = latestStatusEvents([a, b]);
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe(b.id);
  });

  it('does not let a later offer hide an earlier unresolved need', () => {
    const need = ev({ t: 'help', ts: 1, gh: 'wh0r', st: 'need', cat: 'water' });
    const offer = ev({ t: 'help', ts: 2, gh: 'wh0r', st: 'offer', cat: 'shelter' });
    expect(latestStatusEvents([need, offer]).map((event) => event.id)).toEqual([offer.id, need.id]);
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
    expect(latestStatusEvents([a, b]).map((event) => event.id)).toEqual(
      latestStatusEvents([b, a]).map((event) => event.id),
    );
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

describe('threads and lifecycle', () => {
  it('derives replies, responders, resolution, and valid retractions', () => {
    const parent = ev({ t: 'help', ts: 1, gh: 'wh0r', st: 'need', cat: 'rescue' });
    const reply = ev({ t: 'reply', ts: 2, gh: 'wh0r', re: parent.id, msg: 'Where exactly?' }, other);
    const onit = ev({ t: 'ack', ts: 3, gh: 'wh0r', re: parent.id, ak: 'onit' }, other);
    const done = ev({ t: 'ack', ts: 4, gh: 'wh0r', re: parent.id, ak: 'done' }, other);
    const tombstone = ev({ t: 'retract', ts: 5, gh: 'wh0r', re: reply.id }, other);
    const view = latestStatusEvents([parent, reply, onit, done, tombstone])[0]!;
    expect(view).toMatchObject({ resolved: true, responders: 1, replies: 0 });
    expect(threadFor([parent, reply, onit, done, tombstone], parent.id)).toEqual([onit, done]);
    expect(validRetractionIds([parent, reply, tombstone])).toEqual(new Set([reply.id]));
  });

  it('ignores a retraction signed by someone other than the target owner', () => {
    const parent = ev({ t: 'help', ts: 1, gh: 'wh0r', st: 'need' });
    const forged = ev({ t: 'retract', ts: 2, gh: 'wh0r', re: parent.id }, other);
    expect(latestStatusEvents([parent, forged])).toHaveLength(1);
  });

  it('returns area chat in chronological order and hides valid retractions', () => {
    const a = ev({ t: 'chat', ts: 2, gh: 'wh0r', msg: 'second' });
    const b = ev({ t: 'chat', ts: 1, gh: 'wh0r', msg: 'first' });
    const otherArea = ev({ t: 'chat', ts: 3, gh: 'zzzz', msg: 'elsewhere' });
    const retract = ev({ t: 'retract', ts: 4, gh: 'wh0r', re: a.id });
    expect(chatEvents([a, b, otherArea, retract], 'wh0r').map((event) => event.id)).toEqual([b.id]);
  });
});
