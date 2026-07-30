import { createEvent, type NewEventInput, type SetuEvent } from '@setu/shared';
import { create } from 'zustand';
import { db } from '../db/schema';
import { ingestEvents, liveEvents, pruneEvents } from '../db/events';
import { buildDemoEvents, DEMO_BULLETIN_ID } from '../lib/demoSeed';
import { useAppStore } from './appStore';
import { useSyncStore } from './syncStore';

interface EventsState {
  /** true once the initial load from IndexedDB has completed */
  ready: boolean;
  error: string | null;
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
  error: null,
  events: [],

  hydrate: () => {
    if (get().ready) return Promise.resolve();
    if (!hydration) {
      hydration = (async () => {
        await pruneEvents();
        const events = await liveEvents();
        set({ events, ready: true, error: null });
      })().catch((error: unknown) => {
        set({ ready: true, error: error instanceof Error ? error.message : 'storage unavailable' });
      });
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
    // Checked directly against IndexedDB (not the in-memory `events`, which
    // may not be hydrated yet) so a repeat `?demo=1` visit is a true no-op.
    // Written with bulkPut rather than ingestEvents: the seed is trusted local
    // data signed on this device (see demoSeed.ts), and ingestEvents' shape
    // gate caps ttl at 7 days for events arriving over the network — which the
    // pinned bulletin's intentional 5-year ttl would fail.
    if (await db.events.get(DEMO_BULLETIN_ID)) return;
    await db.events.bulkPut(buildDemoEvents());
    await get().refresh();
  },
}));
