/**
 * WebSocket sync at /ws. Attaches to the existing HTTP server so the relay is
 * one process serving both the app and sync.
 *
 * Rooms: every socket joins a `global` room plus a room keyed by the 2-char
 * prefix of its `?gh=` (its area). Every event lives in the global room too, so
 * a socket in `global` reconciles against — and receives live pushes of — the
 * whole store. That guarantees the demo property "one relay live-syncs N
 * devices" regardless of area; the per-area rooms are kept as the seam for a
 * future bandwidth-scoped relay, not used to restrict delivery today.
 *
 * Reconciliation is server-driven (see wire.ts): peer sends `have`, we answer
 * with the `events` it lacks + a `want` for what we lack; `events` pushes flow
 * both ways afterwards.
 */
import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocket, WebSocketServer, type RawData } from 'ws';
import type { SetuEvent, SyncMessage } from '@setu/shared';
import type { EventStore } from './store.js';

const nowSeconds = (): number => Math.floor(Date.now() / 1000);

interface Peer {
  ws: WebSocket;
  /** rooms this socket belongs to: 'global' + its 2-char gh prefix (if any). */
  rooms: Set<string>;
}

/** Handle returned by {@link attachSync} for pushing events in from outside /ws. */
export interface SyncHub {
  /**
   * Ingest externally-produced events (e.g. the SMS webhook) and push the
   * newly-stored ones to every connected peer. Returns the events that were new.
   */
  publish(events: SetuEvent[]): SetuEvent[];
}

export function attachSync(server: Server, store: EventStore): SyncHub {
  const wss = new WebSocketServer({ noServer: true });
  const peers = new Set<Peer>();

  server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    let url: URL;
    try {
      url = new URL(req.url ?? '/', 'http://localhost');
    } catch {
      socket.destroy();
      return;
    }
    if (url.pathname !== '/ws') {
      socket.destroy();
      return;
    }
    const ghPrefix = (url.searchParams.get('gh') ?? '').slice(0, 2);
    wss.handleUpgrade(req, socket, head, (ws) => {
      const rooms = new Set<string>(['global']);
      if (ghPrefix) rooms.add(ghPrefix);
      const peer: Peer = { ws, rooms };
      peers.add(peer);
      ws.on('message', (data) => onMessage(peer, data));
      ws.on('close', () => peers.delete(peer));
      ws.on('error', () => {
        try {
          ws.close();
        } catch {
          /* already gone */
        }
      });
    });
  });

  function onMessage(peer: Peer, data: RawData): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data.toString());
    } catch {
      return;
    }
    // JSON.parse happily yields null/true/42/"x"/[] for non-object input; any
    // of those would make `msg.type` throw *outside* the try above and take the
    // whole relay process down (uncaught exception on the ws 'message' event).
    // A crisis relay must survive a malformed or hostile frame, so drop anything
    // that isn't a plain object here.
    if (!parsed || typeof parsed !== 'object') return;
    const msg = parsed as SyncMessage;
    const now = nowSeconds();

    if (msg.type === 'have' && Array.isArray(msg.ids)) {
      const { missing, want } = store.reconcile(msg.ids, now);
      if (missing.length) sendEvents(peer.ws, missing);
      if (want.length) send(peer.ws, { type: 'want', ids: want });
    } else if (msg.type === 'want' && Array.isArray(msg.ids)) {
      const events = store.getByIds(msg.ids, now);
      if (events.length) sendEvents(peer.ws, events);
    } else if (msg.type === 'events' && Array.isArray(msg.events)) {
      const added = store.ingest(msg.events, now);
      if (added.length) broadcast(added, peer);
    }
  }

  /**
   * Push newly-stored events to connected peers. `from` (the peer that supplied
   * them over /ws) is skipped; pass null for events injected from outside the
   * socket layer, e.g. the SMS webhook, which should reach everyone.
   */
  function broadcast(events: SetuEvent[], from: Peer | null): void {
    const payload = JSON.stringify({ type: 'events', events } satisfies SyncMessage);
    for (const peer of peers) {
      if (peer === from) continue;
      if (peer.ws.readyState === WebSocket.OPEN) peer.ws.send(payload);
    }
  }

  return {
    publish(events: SetuEvent[]): SetuEvent[] {
      const added = store.ingest(events, nowSeconds());
      if (added.length) broadcast(added, null);
      return added;
    },
  };

  function sendEvents(ws: WebSocket, events: SetuEvent[]): void {
    send(ws, { type: 'events', events });
  }

  function send(ws: WebSocket, msg: SyncMessage): void {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }
}
