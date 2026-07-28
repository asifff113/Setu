import { createEvent, type NewEventInput, type SetuEvent } from '@setu/shared';
import { create } from 'zustand';
import { ingestEvents, liveEvents, pruneEvents } from '../db/events';
import { buildDemoEvents, hasDemoSeed } from '../lib/demoSeed';
import { useAppStore } from './appStore';
import { useSyncStore } from './syncStore';

interface EventsState {
  /** true once the initial load from IndexedDB has completed */
  ready: boolean;
  /** all non-expired events, unsorted; screens derive their own views */
  events: SetuEvent[];

  /** Load events from IndexedDB (pruning expired/overflow first). Idempotent. */
  hydrate: () => Promise<void>;
  /** Re-read the live event set from IndexedDB into the store. */
  refresh: () => Promise<void>;
  /** Sign a new event with this device's identity, ingest it, and refresh. */
  publish: (input: NewEventInput) => Promise<SetuEvent>;
  /**
   * Load the `?demo=1` / "Try the demo" seed events. Stored locally only —
   * never pushed to a relay — and a no-op if the seed is already present.
   */
  seedDemo: () => Promise<void>;
}

// Shared across subscribers so concurrent hydrate() calls resolve to one load.
let hydration: Promise<void> | null = null;

export const useEventsStore = create<EventsState>((set, get) => ({
  ready: false,
  events: [],

  hydrate: () => {
    if (get().ready) return Promise.resolve();
    if (!hydration) {
      hydration = (async () => {
        await pruneEvents();
        const events = await liveEvents();
        set({ events, ready: true });
      })();
    }
    return hydration;
  },

  refresh: async () => {
    set({ events: await liveEvents() });
  },

  publish: async (input) => {
    const identity = useAppStore.getState().identity;
    if (!identity) throw new Error('cannot publish before identity is ready');

    const event = createEvent(input, {
      secretKey: identity.secretKey,
      publicKey: identity.publicKey,
    });
    await ingestEvents([event]);
    await get().refresh();
    // Fan the new event out over whatever relay we're connected to; if we're
    // offline it stays local and syncs opportunistically on next connect.
    useSyncStore.getState().push([event]);
    return event;
  },

  seedDemo: async () => {
    if (hasDemoSeed(get().events)) return;
    await ingestEvents(buildDemoEvents());
    await get().refresh();
  },
}));
