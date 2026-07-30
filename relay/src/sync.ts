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
import { isPrivateHost } from './net.js';
import type { EventStore } from './store.js';

const nowSeconds = (): number => Math.floor(Date.now() / 1000);
const MAX_WS_PAYLOAD_BYTES = 512 * 1024;
const MAX_IDS_PER_MESSAGE = 5000;
const MAX_EVENTS_PER_MESSAGE = 500;
const ID_RE = /^[A-Za-z0-9_-]{22}$/;

// Connection-level DoS bounds. A crisis relay has to stay up under a flood of
// signed-but-worthless traffic, not just malformed input — every legitimate
// event costs a signature verification and a broadcast fan-out, so the limits
// below are as important as the shape/size gates in store.ts.
const MAX_PEERS_TOTAL = Number(process.env.WS_MAX_PEERS ?? 5000);
const MAX_PEERS_PER_IP = Number(process.env.WS_MAX_PEERS_PER_IP ?? 20);
const MAX_MESSAGES_PER_WINDOW = Number(process.env.WS_MAX_MESSAGES ?? 60);
const MESSAGE_WINDOW_MS = Number(process.env.WS_MESSAGE_WINDOW_MS ?? 10_000);
const PING_INTERVAL_MS = 30_000;
/** Peers whose outbound send buffer grows past this are slow/stalled and get dropped. */
const MAX_BUFFERED_BYTES = 4 * 1024 * 1024;

/** Best-effort client IP for the per-IP connection cap (same trust model as index.ts's clientKey). */
function remoteAddress(req: IncomingMessage): string {
  const fly = req.headers['fly-client-ip'];
  if (typeof fly === 'string' && fly.trim() && process.env.FLY_APP_NAME) return fly.trim();
  if (process.env.TRUST_PROXY === '1') {
    const xff = req.headers['x-forwarded-for'];
    const first = (Array.isArray(xff) ? xff[0] : xff)?.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.socket.remoteAddress ?? 'unknown';
}

function originAllowed(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;
  const configured = process.env.WS_ALLOWED_ORIGINS?.split(',').map((value) => value.trim()).filter(Boolean);
  if (configured?.length) return configured.includes(origin);
  try {
    const originUrl = new URL(origin);
    if (originUrl.host === req.headers.host) return true;
    // A phone that loaded the app from one node and then scans a different
    // node's /node-qr has an Origin that won't match this Host — that
    // cross-node handoff is exactly what /node-qr is for, so it's allowed
    // when the Origin itself is a private/LAN address (never a public one).
    // A relay meant to be locked down tighter than this should set
    // WS_ALLOWED_ORIGINS explicitly, which takes priority above.
    return isPrivateHost(originUrl.hostname);
  } catch {
    return false;
  }
}

interface Peer {
  ws: WebSocket;
  /** rooms this socket belongs to: 'global' + its 2-char gh prefix (if any). */
  rooms: Set<string>;
  ip: string;
  /** Reset to true on every pong; the ping sweep terminates peers still false. */
  alive: boolean;
  /** Fixed-window message counter for this connection's own rate limit. */
  msgWindowStart: number;
  msgCount: number;
}

/** Handle returned by {@link attachSync} for pushing events in from outside /ws. */
export interface SyncHub {
  /**
   * Ingest externally-produced events (e.g. the SMS webhook) and push the
   * newly-stored ones to every connected peer. Returns the events that were new.
   */
  publish(events: SetuEvent[]): SetuEvent[];
  /** Stop the keepalive timer and close every connected peer (graceful shutdown). */
  close(): void;
}

export function attachSync(server: Server, store: EventStore): SyncHub {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_WS_PAYLOAD_BYTES, perMessageDeflate: false });
  const peers = new Set<Peer>();
  const ipCounts = new Map<string, number>();

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
    const ip = remoteAddress(req);
    if (peers.size >= MAX_PEERS_TOTAL || (ipCounts.get(ip) ?? 0) >= MAX_PEERS_PER_IP) {
      socket.write('HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    const ghPrefix = (url.searchParams.get('gh') ?? '').slice(0, 2);
    wss.handleUpgrade(req, socket, head, (ws) => {
      const rooms = new Set<string>(['global']);
      if (ghPrefix) rooms.add(ghPrefix);
      const peer: Peer = { ws, rooms, ip, alive: true, msgWindowStart: Date.now(), msgCount: 0 };
      peers.add(peer);
      ipCounts.set(ip, (ipCounts.get(ip) ?? 0) + 1);
      const drop = (): void => {
        if (!peers.delete(peer)) return;
        const n = (ipCounts.get(ip) ?? 1) - 1;
        if (n <= 0) ipCounts.delete(ip);
        else ipCounts.set(ip, n);
      };
      ws.on('pong', () => {
        peer.alive = true;
      });
      ws.on('message', (data) => onMessage(peer, data));
      ws.on('close', drop);
      ws.on('error', () => {
        try {
          ws.close();
        } catch {
          /* already gone */
        }
      });
    });
  });

  // Reap dead sockets (phones that dropped off Wi-Fi without a clean close
  // leave nothing but a half-open TCP connection otherwise) and detect
  // stalled peers via missed pongs.
  const pingInterval = setInterval(() => {
    for (const peer of peers) {
      if (!peer.alive) {
        peer.ws.terminate();
        continue;
      }
      peer.alive = false;
      try {
        peer.ws.ping();
      } catch {
        /* socket already going away */
      }
    }
  }, PING_INTERVAL_MS).unref();

  function onMessage(peer: Peer, data: RawData): void {
    if (!withinMessageLimit(peer)) return closePolicy(peer.ws);

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

  /** Per-connection fixed-window limit: caps how fast one socket can drive reconciliation/ingest. */
  function withinMessageLimit(peer: Peer): boolean {
    const now = Date.now();
    if (now - peer.msgWindowStart >= MESSAGE_WINDOW_MS) {
      peer.msgWindowStart = now;
      peer.msgCount = 0;
    }
    peer.msgCount++;
    return peer.msgCount <= MAX_MESSAGES_PER_WINDOW;
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
      sendRaw(peer.ws, payload);
    }
  }

  return {
    publish(events: SetuEvent[]): SetuEvent[] {
      const added = store.ingest(events, nowSeconds());
      if (added.length) broadcast(added, null);
      return added;
    },
    close(): void {
      clearInterval(pingInterval);
      for (const peer of peers) {
        try {
          peer.ws.close(1001, 'server shutting down');
        } catch {
          /* already gone */
        }
      }
    },
  };

  function sendEvents(ws: WebSocket, events: SetuEvent[]): void {
    for (let i = 0; i < events.length; i += MAX_EVENTS_PER_MESSAGE) {
      send(ws, { type: 'events', events: events.slice(i, i + MAX_EVENTS_PER_MESSAGE) });
    }
  }

  function send(ws: WebSocket, msg: SyncMessage): void {
    sendRaw(ws, JSON.stringify(msg));
  }

  /**
   * Single send choke point: skips a peer whose outbound buffer has grown
   * past {@link MAX_BUFFERED_BYTES} (a slow client or a stalled connection the
   * TCP layer hasn't noticed yet) instead of piling more data onto it —
   * unbounded `bufferedAmount` growth during an event flood is a memory leak
   * against one wedged socket. The next ping sweep or a `close` event cleans
   * it up; if it's actually still reading, its next `have` will recover
   * anything it missed.
   */
  function sendRaw(ws: WebSocket, payload: string): void {
    if (ws.readyState !== WebSocket.OPEN) return;
    if (ws.bufferedAmount > MAX_BUFFERED_BYTES) {
      ws.terminate();
      return;
    }
    ws.send(payload);
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
