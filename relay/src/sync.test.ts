import { createEvent, generateKeypair, type SetuEvent } from '@setu/shared';
import type { AddressInfo } from 'node:net';
import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { attachSync } from './sync.js';
import { EventStore } from './store.js';

/** Spin up a throwaway HTTP+WS relay on an ephemeral port for one test. */
function startRelay(): Promise<{ server: Server; port: number; store: EventStore }> {
  const server = createServer((_req, res) => res.end('ok'));
  const store = new EventStore(); // :memory:
  attachSync(server, store);
  return new Promise((resolve) => {
    server.listen(0, () => {
      const port = (server.address() as AddressInfo).port;
      resolve({ server, port, store });
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

describe('relay /ws message handling', () => {
  it('closes clients that exceed reconciliation limits', async () => {
    const { server, port } = await startRelay();
    relayServer = server;
    const ws = await connect(port);
    const closed = new Promise<number>((resolve) => ws.on('close', resolve));
    ws.send(JSON.stringify({ type: 'have', ids: Array.from({ length: 5001 }, () => 'a'.repeat(22)) }));
    expect(await closed).toBe(1008);
  });
  it('survives non-object JSON frames (null / number / array / string) without crashing', async () => {
    const { server, port } = await startRelay();
    relayServer = server;

    // If any of these frames threw inside the ws 'message' handler, the
    // uncaught exception would tear the process down before the assertions run.
    const attacker = await connect(port);
    for (const frame of ['null', 'true', '42', '"hello"', '[]', '{}', 'not json at all']) {
      attacker.send(frame);
    }
    // Round-trip a real message afterwards to prove the socket + relay are still live.
    const kp = generateKeypair();
    const ev: SetuEvent = createEvent(
      { t: 'checkin', ts: Math.floor(Date.now() / 1000), gh: '', st: 'safe', n: 'Test' },
      kp,
    );

    const listener = await connect(port);
    const gotIt = new Promise<SetuEvent[]>((resolve) => {
      listener.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg?.type === 'events') resolve(msg.events);
      });
    });
    // Listener advertises empty; attacker pushes the event; relay must forward it.
    listener.send(JSON.stringify({ type: 'have', ids: [] }));
    attacker.send(JSON.stringify({ type: 'events', events: [ev] }));

    const forwarded = await gotIt;
    expect(forwarded.some((e) => e.id === ev.id)).toBe(true);
  });
});
