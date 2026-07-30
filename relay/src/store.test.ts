import { createEvent, DEMO_KEYPAIRS, generateKeypair, pubkeyToAuthor, type SetuEvent } from '@setu/shared';
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

  it('rejects events signed by a known demo-seed author, even though they verify fine', () => {
    const store = new EventStore();
    // A public demo URL must never let a stranger sign valid events as a
    // "demo author" and push them onto a real, shared board — see
    // shared/src/demo.ts. The seeds are deliberately public, so anyone can
    // reproduce this signature; the relay has to reject it explicitly.
    const demoEvent = createEvent(
      { t: 'checkin', ts: NOW, gh: 'wh0r', st: 'safe', n: 'Demo' },
      DEMO_KEYPAIRS[0]!,
    );
    const added = store.ingest([demoEvent], NOW);
    expect(added).toHaveLength(0);
    expect(store.count()).toBe(0);
  });
});

describe('EventStore storage limits', () => {
  it('enforces a global row cap with oldest-first eviction', () => {
    const store = new EventStore(undefined, { maxRows: 3, maxPerAuthor: 100 });
    const events = Array.from({ length: 5 }, (_, i) => checkin({ ts: NOW + i, x: String(i) }));
    const added = store.ingest(events, NOW + 10);
    expect(added).toHaveLength(5); // every event verifies; the cap trims storage, not ingest
    expect(store.count()).toBe(3);
    const survivors = store.allLive(NOW + 10).map((e) => e.ts).sort((a, b) => a - b);
    expect(survivors).toEqual([events[2]!.ts, events[3]!.ts, events[4]!.ts]);
  });

  it('enforces a per-author cap with oldest-first eviction for that author, leaving other authors untouched', () => {
    const store = new EventStore(undefined, { maxRows: 1000, maxPerAuthor: 2 });
    const hoarder = generateKeypair();
    const hoarderAuthor = pubkeyToAuthor(hoarder.publicKey);
    const hoarderEvents = Array.from({ length: 4 }, (_, i) =>
      createEvent({ t: 'checkin', ts: NOW + i, gh: 'wh0r', st: 'safe', x: String(i) }, hoarder),
    );
    const other = checkin({ ts: NOW, x: 'other' });
    store.ingest([...hoarderEvents, other], NOW + 10);

    expect(store.count()).toBe(3); // 2 survivors for the hoarder + 1 untouched other author
    const live = store.allLive(NOW + 10);
    const hoarderSurvivors = live
      .filter((e) => e.au === hoarderAuthor)
      .map((e) => e.ts)
      .sort((a, b) => a - b);
    expect(hoarderSurvivors).toEqual([hoarderEvents[2]!.ts, hoarderEvents[3]!.ts]);
    expect(live.some((e) => e.id === other.id)).toBe(true);
  });
});
