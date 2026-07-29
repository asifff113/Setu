import { createEvent, generateKeypair, type SetuEvent } from '@setu/shared';
import { describe, expect, it } from 'vitest';
import { EventStore } from './store.js';

const kp = generateKeypair();
const NOW = 1_700_000_000;

function checkin(overrides: Partial<Parameters<typeof createEvent>[0]> = {}): SetuEvent {
  return createEvent({ t: 'checkin', ts: NOW, gh: 'wh0r', st: 'safe', n: 'Rahim', ...overrides }, kp);
}

describe('EventStore.ingest shape gate', () => {
  it('stores a normal, verifiable event', () => {
    const store = new EventStore(); // :memory:
    const added = store.ingest([checkin()], NOW);
    expect(added).toHaveLength(1);
    expect(store.count()).toBe(1);
  });

  it('drops an oversized event even though its signature verifies', () => {
    const store = new EventStore();
    // A validly-signed 1 MB blob — the review\'s "sign anything with your own key"
    // attack. It must never reach the store or the broadcast fan-out.
    const huge = createEvent({ t: 'bulletin', ts: NOW, gh: 'aa', msg: 'x'.repeat(1_000_000) }, kp);
    const added = store.ingest([huge], NOW);
    expect(added).toHaveLength(0);
    expect(store.count()).toBe(0);
  });

  it('drops malformed events (numeric field, missing gh) but keeps a good sibling', () => {
    const store = new EventStore();
    const good = checkin({ n: 'Karim', ts: NOW - 10 });
    const numericGh = { ...checkin(), gh: 123 as never };
    const noGh = { ...checkin(), gh: undefined as never };
    const added = store.ingest([numericGh, noGh, good], NOW);
    expect(added).toHaveLength(1);
    expect(added[0]!.id).toBe(good.id);
  });
});
