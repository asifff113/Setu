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
import { ingestEvents, liveEventIds, liveEvents } from '../db/events';
import { db } from '../db/schema';
import { RelayWS, type RelayStatus, type RelayWSHooks } from '../sync/RelayWS';
import { deriveAutoWsUrl, isPrivateWsUrl, normalizeNodeUrl, withGh } from '../sync/wsurl';
import { useAppStore } from './appStore';
import { useEventsStore } from './eventsStore';

const NODE_URL_KEY = 'setu.nodeUrl';

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
  /** Recompute event count + storage estimate. */
  refreshStats: () => Promise<void>;
}

// Module-scoped: exactly one live connection, plus what kind it is.
let relay: RelayWS | null = null;
let currentKind: 'relay' | 'node' = 'relay';
let started = false;

export const useSyncStore = create<SyncState>((set, get) => {
  const hooks: RelayWSHooks = {
    getLocalIds: () => liveEventIds(),
    getLocalEvents: async (ids) => {
      const wanted = new Set(ids);
      return (await liveEvents()).filter((e) => wanted.has(e.id));
    },
    onEvents: async (events) => {
      const res = await ingestEvents(events);
      if (res.added > 0) {
        await useEventsStore.getState().refresh();
        void get().refreshStats();
      }
    },
    onStatus: (s: RelayStatus) => {
      if (s === 'connected') set({ status: currentKind });
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

      // Chromium-only Background Sync isn't reliable; instead re-sync whenever
      // the app regains the network or comes to the foreground.
      if (typeof window !== 'undefined') {
        const resync = () => relay?.resync();
        window.addEventListener('online', resync);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') resync();
        });
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
