/**
 * Connection-level DoS-bound tests for attachSync (see sync.ts). Split into
 * its own file (rather than sync.test.ts) because the limits below are read
 * from process.env at module-eval time — they're set here via a dynamic
 * `import()` inside beforeAll (which runs *after* the assignment, unlike a
 * static top-level `import`, which ES modules hoist above any code in this
 * file) so a small cap can be exercised without touching the defaults other
 * tests rely on.
 */
import type { AddressInfo } from 'node:net';
import { createServer, type Server } from 'node:http';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import type { EventStore as EventStoreType } from './store.js';
import type { attachSync as attachSyncType } from './sync.js';

let attachSync: typeof attachSyncType;
let EventStore: typeof EventStoreType;

beforeAll(async () => {
  process.env.WS_MAX_PEERS_PER_IP = '2';
  process.env.WS_MAX_MESSAGES = '3';
  process.env.WS_MESSAGE_WINDOW_MS = '60000';
  ({ attachSync } = await import('./sync.js'));
  ({ EventStore } = await import('./store.js'));
});

function startRelay(): Promise<{ server: Server; port: number }> {
  const server = createServer((_req, res) => res.end('ok'));
  const store = new EventStore(); // :memory:
  attachSync(server, store);
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port;
      resolve({ server, port });
    });
  });
}

const openSockets: WebSocket[] = [];
let relayServer: Server | null = null;

function connect(port: number): Promise<WebSocket> {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  openSockets.push(ws);
  return new Promise((resolve, reject) => {
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
    ws.on('unexpected-response', (_req, res) => reject(new Error(`HTTP ${res.statusCode}`)));
  });
}

afterEach(async () => {
  for (const ws of openSockets.splice(0)) {
    try {
      ws.close();
    } catch {
      /* already gone */
    }
  }
  if (relayServer) {
    await new Promise<void>((r) => relayServer!.close(() => r()));
    relayServer = null;
  }
});

describe('per-IP connection cap', () => {
  it('rejects a connection past WS_MAX_PEERS_PER_IP from the same address', async () => {
    const { server, port } = await startRelay();
    relayServer = server;

    await connect(port);
    await connect(port);
    // 127.0.0.1 already holds 2 (the WS_MAX_PEERS_PER_IP set above) — a 3rd
    // upgrade from the same address must be refused before the handshake
    // completes, not silently accepted.
    await expect(connect(port)).rejects.toThrow(/429/);
  });
});

describe('per-connection message rate limit', () => {
  it('closes a socket that exceeds WS_MAX_MESSAGES within the window', async () => {
    const { server, port } = await startRelay();
    relayServer = server;
    const ws = await connect(port);
    const closed = new Promise<number>((resolve) => ws.on('close', resolve));

    // WS_MAX_MESSAGES=3 above; the 4th message in the same window must close
    // the socket as a policy violation (1008), independent of message content.
    for (let i = 0; i < 4; i++) {
      ws.send(JSON.stringify({ type: 'have', ids: [] }));
    }
    expect(await closed).toBe(1008);
  });
});
