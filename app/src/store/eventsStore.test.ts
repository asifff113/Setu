// Must run before db/schema.ts's `export const db = new SetuDB()` executes,
// so Dexie sees a real IndexedDB implementation. Since this is the first
// import in the file, its module body runs before any of the imports below
// (import order within a file is preserved; only hoisting above non-import
// statements is special-cased by the module spec).
import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/schema';
import { DEMO_BULLETIN_ID } from '../lib/demoSeed';
import { useEventsStore } from './eventsStore';

beforeEach(async () => {
  await db.events.clear();
  useEventsStore.setState({ ready: false, error: null, events: [] });
});

describe('eventsStore.seedDemo', () => {
  it('persists the seed including the verified bulletin (regression: it used to be silently dropped by ingestEvents\' 7-day ttl gate)', async () => {
    await useEventsStore.getState().seedDemo();
    const stored = await db.events.get(DEMO_BULLETIN_ID);
    expect(stored).toBeDefined();
    expect(stored?.ttl).toBeGreaterThan(604_800); // the pinned 5-year ttl, written verbatim
    expect(await db.events.count()).toBe(16);
  });

  it('is idempotent across repeat calls, checked directly against IndexedDB', async () => {
    await useEventsStore.getState().seedDemo();
    await useEventsStore.getState().seedDemo();
    expect(await db.events.count()).toBe(16);
  });

  it('stays idempotent even when the in-memory store has not hydrated yet', async () => {
    await useEventsStore.getState().seedDemo();
    // Simulate a fresh page load: in-memory `events` is empty again, but the
    // seed already lives in IndexedDB from the earlier `?demo=1` visit above.
    // Before the fix, hasDemoSeed(get().events) checked the (possibly empty)
    // in-memory array instead of the store, so this would have re-seeded.
    useEventsStore.setState({ events: [] });
    await useEventsStore.getState().seedDemo();
    expect(await db.events.count()).toBe(16);
  });

  it('refreshes the in-memory events after seeding', async () => {
    await useEventsStore.getState().seedDemo();
    expect(useEventsStore.getState().events).toHaveLength(16);
  });
});
