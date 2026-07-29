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
const MAX_WS_PAYLOAD_BYTES = 512 * 1024;
const MAX_IDS_PER_MESSAGE = 5000;
const MAX_EVENTS_PER_MESSAGE = 500;
const ID_RE = /^[A-Za-z0-9_-]{22}$/;

function originAllowed(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;
  const configured = process.env.WS_ALLOWED_ORIGINS?.split(',').map((value) => value.trim()).filter(Boolean);
  if (configured?.length) return configured.includes(origin);
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

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
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_WS_PAYLOAD_BYTES, perMessageDeflate: false });
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
    if (!originAllowed(req)) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
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
      const ids = validIds(msg.ids);
      if (!ids) return closePolicy(peer.ws);
      const { missing, want } = store.reconcile(ids, now);
      if (missing.length) sendEvents(peer.ws, missing);
      if (want.length) send(peer.ws, { type: 'want', ids: want });
    } else if (msg.type === 'want' && Array.isArray(msg.ids)) {
      const ids = validIds(msg.ids);
      if (!ids) return closePolicy(peer.ws);
      const events = store.getByIds(ids, now);
      if (events.length) sendEvents(peer.ws, events);
    } else if (msg.type === 'events' && Array.isArray(msg.events)) {
      if (msg.events.length > MAX_EVENTS_PER_MESSAGE) return closePolicy(peer.ws);
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
    for (let i = 0; i < events.length; i += MAX_EVENTS_PER_MESSAGE) {
      send(ws, { type: 'events', events: events.slice(i, i + MAX_EVENTS_PER_MESSAGE) });
    }
  }

  function send(ws: WebSocket, msg: SyncMessage): void {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }

  function validIds(value: unknown[]): string[] | null {
    if (value.length > MAX_IDS_PER_MESSAGE) return null;
    const ids: string[] = [];
    for (const id of value) {
      if (typeof id !== 'string' || !ID_RE.test(id)) return null;
      ids.push(id);
    }
    return ids;
  }

  function closePolicy(ws: WebSocket): void {
    ws.close(1008, 'message exceeds protocol limits');
  }
}
