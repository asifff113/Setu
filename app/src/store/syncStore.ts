/**
 * syncStore — React-facing owner of the relay connection (Phase 4).
 *
 * Holds a single active RelayWS at a time and picks its target:
 *   - a manually chosen local node (persisted in localStorage), else
 *   - the origin the app was served from (auto).
 * Whether that target reads as 🟢 relay or 🟡 local node is decided by
 * `isPrivateWsUrl` (a LAN/localhost host is a node). Incoming events flow
 * through the same verified `ingestEvents` path every transport uses, then
 * refresh the events store so Home/Board/Map update live.
 */
import type { SetuEvent } from '@setu/shared';
import { create } from 'zustand';
import { ingestEvents, liveEvents, pruneEvents } from '../db/events';
import { db } from '../db/schema';
import { isDemoEvent } from '../lib/demoSeed';
import { RelayWS, type RelayStatus, type RelayWSHooks } from '../sync/RelayWS';
import { deriveAutoWsUrl, isPrivateWsUrl, normalizeNodeUrl, withGh } from '../sync/wsurl';
import { useAppStore } from './appStore';
import { useEventsStore } from './eventsStore';
import { notifyIncoming } from '../lib/notifications';
import { retryMediaUploads } from '../lib/media';

const NODE_URL_KEY = 'setu.nodeUrl';
// hydrate() only prunes once at boot, but a crisis device can stay open (and
// keep receiving events) for days — re-check periodically and whenever the
// app comes back to the foreground so IndexedDB stays bounded.
const PRUNE_INTERVAL_MS = 30 * 60 * 1000;

async function pruneAndRefresh(): Promise<void> {
  const removed = await pruneEvents();
  if (removed > 0) await useEventsStore.getState().refresh();
}

/** 🟡 connecting · 🟢 relay · 🟡 node · 🔴 offline (offline is normal, not an error). */
export type SyncStatus = 'connecting' | 'relay' | 'node' | 'offline';

interface SyncState {
  status: SyncStatus;
  /** unix seconds of the last received reconciliation/live batch. */
  lastSyncAt: number | null;
  /** the manually chosen local node ws url, or null when on auto. */
  nodeUrl: string | null;
  eventCount: number;
  storageBytes: number | null;

  /** Start syncing (idempotent). Call once at app boot. */
  init: () => void;
  /** Connect to a typed/scanned local node. Returns a dict error key or null. */
  connectNode: (raw: string) => string | null;
  /** Forget the local node and fall back to the auto/origin target. */
  disconnectNode: () => void;
  /** Broadcast freshly-created local events to the relay. */
  push: (events: SetuEvent[]) => void;
  /** Ask the active link to reconcile immediately (manual refresh). */
  resync: () => void;
  /** Recompute event count + storage estimate. */
  refreshStats: () => Promise<void>;
}

// Module-scoped: exactly one live connection, plus what kind it is.
let relay: RelayWS | null = null;
let currentKind: 'relay' | 'node' = 'relay';
let started = false;

export const useSyncStore = create<SyncState>((set, get) => {
  const hooks: RelayWSHooks = {
    // Demo-seed events are excluded from both sides of reconciliation so the
    // `?demo=1` board stays strictly local: we never advertise their ids in a
    // `have`, and never answer a `want` with one. Without this, a public demo
    // URL would upload per-visitor demo events onto the shared relay, which then
    // rebroadcasts them to every device. See isDemoEvent.
    getLocalIds: async () =>
      (await liveEvents()).filter((e) => !isDemoEvent(e)).map((e) => e.id),
    getLocalEvents: async (ids) => {
      const wanted = new Set(ids);
      return (await liveEvents()).filter((e) => wanted.has(e.id) && !isDemoEvent(e));
    },
    onEvents: async (events) => {
      const res = await ingestEvents(events);
      if (res.added > 0) {
        await useEventsStore.getState().refresh();
        void get().refreshStats();
        void notifyIncoming(res.addedEvents);
      }
    },
    onStatus: (s: RelayStatus) => {
      if (s === 'connected') {
        set({ status: currentKind });
        void retryMediaUploads(get().nodeUrl);
      }
      else if (s === 'connecting') set({ status: 'connecting' });
      else set({ status: 'offline' });
    },
    onSynced: () => set({ lastSyncAt: Math.floor(Date.now() / 1000) }),
  };

  /** Tear down any existing connection and start one at the chosen target. */
  function startTarget(nodeUrl: string | null): void {
    relay?.stop();
    relay = null;

    let base: string | null;
    if (nodeUrl) {
      base = nodeUrl; // already normalized by connectNode/localStorage
      currentKind = 'node';
    } else {
      base = deriveAutoWsUrl();
      currentKind = isPrivateWsUrl(base) ? 'node' : 'relay';
    }

    if (!base) {
      set({ status: 'offline' }); // e.g. opened over file:// with no relay
      return;
    }

    const gh = useAppStore.getState().settings?.gh ?? '';
    relay = new RelayWS(withGh(base, gh), hooks);
    relay.start();
  }

  return {
    status: 'offline',
    lastSyncAt: null,
    nodeUrl: null,
    eventCount: 0,
    storageBytes: null,

    init: () => {
      if (started) return;
      started = true;

      const stored =
        typeof localStorage !== 'undefined' ? localStorage.getItem(NODE_URL_KEY) : null;
      set({ nodeUrl: stored });
      void get().refreshStats();
      startTarget(stored);

      // The connection URL bakes in `?gh=` as a room hint (see withGh), so
      // changing area on Onboarding/Home doesn't just need a re-advertise —
      // it needs a fresh connection carrying the new prefix. Reconnecting to
      // the *same* target on a real gh change is cheap and rare (onboarding,
      // or a deliberate area change), so a full restart here is simpler and
      // more correct than trying to patch the live socket's query string.
      let lastGh = useAppStore.getState().settings?.gh ?? '';
      useAppStore.subscribe((state) => {
        const gh = state.settings?.gh ?? '';
        if (gh === lastGh) return;
        lastGh = gh;
        startTarget(get().nodeUrl);
      });

      // Chromium-only Background Sync isn't reliable; instead re-sync whenever
      // the app regains the network or comes to the foreground.
      if (typeof window !== 'undefined') {
        const resync = () => relay?.resync();
        window.addEventListener('online', resync);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            resync();
            void pruneAndRefresh();
          }
        });
        setInterval(() => void pruneAndRefresh(), PRUNE_INTERVAL_MS);
      }
    },

    connectNode: (raw) => {
      const url = normalizeNodeUrl(raw);
      if (!url) return 'nodeUrlInvalid';
      if (typeof localStorage !== 'undefined') localStorage.setItem(NODE_URL_KEY, url);
      set({ nodeUrl: url });
      startTarget(url);
      return null;
    },

    disconnectNode: () => {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(NODE_URL_KEY);
      set({ nodeUrl: null });
      startTarget(null);
    },

    push: (events) => {
      relay?.push(events);
    },

    resync: () => {
      relay?.resync();
    },

    refreshStats: async () => {
      const eventCount = await db.events.count();
      let storageBytes: number | null = null;
      if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
        try {
          const est = await navigator.storage.estimate();
          storageBytes = est.usage ?? null;
        } catch {
          /* estimate unavailable on this browser */
        }
      }
      set({ eventCount, storageBytes });
    },
  };
});
