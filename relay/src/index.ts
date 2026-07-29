import { serve } from '@hono/node-server';
import { getConnInfo } from '@hono/node-server/conninfo';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { existsSync, readFileSync } from 'node:fs';
import type { Server } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRelayIdentity } from './identity.js';
import { litePage } from './lite.js';
import { nodeQrPage } from './nodeqr.js';
import { createRateLimiter } from './ratelimit.js';
import { gatewayFromEnv, handleInboundSms } from './sms.js';
import { smsSimPage } from './smssim.js';
import { EventStore } from './store.js';
import { attachSync, type SyncHub } from './sync.js';
import type { Context } from 'hono';
import type { SetuEvent } from '@setu/shared';

// Resolved relative to this file (relay/src/index.ts -> ../../app/dist) so it
// works unchanged whether run via `tsx` from source (local dev, node:local)
// or from the Docker image, as long as that same repo layout is preserved.
// STATIC_DIR can still override it (e.g. an unusual deploy layout).
const __dirname = dirname(fileURLToPath(import.meta.url));
const STATIC_DIR = resolve(process.env.STATIC_DIR ?? join(__dirname, '../../app/dist'));
const INDEX_HTML = join(STATIC_DIR, 'index.html');
const hasBuiltApp = existsSync(INDEX_HTML);

const port = Number(process.env.PORT ?? 8787);
const dataDir = process.env.DATA_DIR;

// The signed event cache and the relay's own identity. Both survive restarts
// when DATA_DIR is set; otherwise they live in memory for the process lifetime.
const store = new EventStore(dataDir);
const identity = loadRelayIdentity(dataDir);
const gateway = gatewayFromEnv(process.env);

// SMS webhook hardening. The endpoint stays open by default (the demo needs it
// for /sms-sim and a gateway that can't add custom headers), but is always
// rate-limited per client, and can be fully locked with a shared secret:
//   SMS_INBOUND_KEY   when set, inbound requests must carry it (see smsAuthOk)
//   SMS_RATE_LIMIT    max inbound requests per window per client IP (default 30)
//   SMS_RATE_WINDOW_MS  sliding window in ms (default 60_000)
const smsInboundKey = process.env.SMS_INBOUND_KEY?.trim() || undefined;
const smsRateLimit = Number(process.env.SMS_RATE_LIMIT ?? 30);
const smsRateWindowMs = Number(process.env.SMS_RATE_WINDOW_MS ?? 60_000);
const smsLimiter = createRateLimiter(smsRateLimit, smsRateWindowMs);

/** Best-effort client identity for rate-limiting: Fly/proxy header, else socket. */
function clientKey(c: Context): string {
  const fly = c.req.header('fly-client-ip')?.trim();
  if (fly) return fly;
  const xff = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
  if (xff) return xff;
  try {
    return getConnInfo(c).remote.address ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

/** True when no inbound secret is configured, or the request presents it. */
function smsAuthOk(c: Context): boolean {
  if (!smsInboundKey) return true;
  const header = c.req.header('x-setu-key')?.trim();
  if (header && header === smsInboundKey) return true;
  const auth = c.req.header('authorization')?.trim();
  return auth === smsInboundKey || auth === `Bearer ${smsInboundKey}`;
}

// Assigned once attachSync runs (after serve() below). Until then, and if the
// webhook is somehow hit mid-startup, fall back to ingest-only (no broadcast)
// so an inbound SMS is still stored rather than lost.
let publish: (events: SetuEvent[]) => SetuEvent[] = (events) =>
  store.ingest(events, Math.floor(Date.now() / 1000));

const app = new Hono();

app.get('/healthz', (c) => c.json({ ok: true, events: store.count() }));

// These non-SPA routes must be registered before the static catch-all below,
// otherwise the index.html fallback would swallow them.
app.get('/node-qr', async (c) => c.html(await nodeQrPage(port)));

// GET /lite — zero-JS read-only board (2G / Opera Mini fallback).
app.get('/lite', (c) => c.html(litePage(store)));

// GET /sms-sim — fake-phone demo posting to the webhook below. When an inbound
// secret is set, it's injected here so the simulator keeps working (note: that
// exposes the key to anyone who can load this page — for a hard lockdown,
// restrict /sms-sim too; the key's real job is authenticating a real gateway).
app.get('/sms-sim', (c) => c.html(smsSimPage(smsInboundKey)));

// POST /api/sms/inbound — gateway webhook (android-sms-gateway + httpSMS + the
// simulator). Rate-limited per client, and gated by SMS_INBOUND_KEY when set,
// so a public relay can't be used to spoof events or amplify SMS. Parses the
// SMS, stores/answers it, and replies via the gateway.
app.post('/api/sms/inbound', async (c) => {
  if (!smsLimiter.allow(clientKey(c))) {
    return c.json({ ok: false, error: 'rate limited' }, 429);
  }
  if (!smsAuthOk(c)) {
    return c.json({ ok: false, error: 'unauthorized' }, 401);
  }
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    body = undefined;
  }
  const { status, json } = await handleInboundSms(body, {
    identity,
    store,
    publish: (events) => publish(events),
    gateway,
    log: (msg) => console.log('[setu-relay] sms:', msg),
  });
  return c.json(json, status as 200 | 400);
});

if (hasBuiltApp) {
  // Real files (JS/CSS/fonts/icons/manifest/sw.js) are served as-is; any path
  // that doesn't match one (e.g. a client-side route like /board) falls
  // through to index.html so React Router can take over — the standard SPA
  // serving pattern.
  app.use('/*', serveStatic({ root: STATIC_DIR }));
  app.get('*', (c) => c.html(readFileSync(INDEX_HTML, 'utf-8')));
} else {
  app.get('/', (c) =>
    c.text(
      'Setu relay is running, but app/dist was not found — run `npm run build -w app` first (or `npm run node:local` from the repo root, which does this for you).',
      503,
    ),
  );
}

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[setu-relay] listening on http://localhost:${info.port}`);
  console.log(`[setu-relay] sync at ws://localhost:${info.port}/ws`);
  console.log(`[setu-relay] relay identity ${identity.author}`);
  console.log(`[setu-relay] cached events: ${store.count()}`);
  console.log(`[setu-relay] sms webhook  POST http://localhost:${info.port}/api/sms/inbound`);
  console.log(`[setu-relay] sms simulator     http://localhost:${info.port}/sms-sim`);
  console.log(`[setu-relay] lite board (no-JS) http://localhost:${info.port}/lite`);
  console.log(
    gateway.url
      ? `[setu-relay] outbound SMS via ${gateway.kind} gateway ${gateway.url}`
      : '[setu-relay] no GATEWAY_URL set — SMS replies are logged only',
  );
  console.log(
    `[setu-relay] sms webhook ${smsInboundKey ? 'requires SMS_INBOUND_KEY' : 'open (no SMS_INBOUND_KEY)'}, ` +
      `rate-limited ${smsRateLimit}/${Math.round(smsRateWindowMs / 1000)}s per client`,
  );
  console.log(
    hasBuiltApp
      ? `[setu-relay] serving app from ${STATIC_DIR}`
      : '[setu-relay] app/dist not found — static serving disabled',
  );
});

// The `serve()` return value is the Node HTTP server; attach the WS upgrade
// handler to it so /ws shares the same port as the app + REST routes. Its type
// is the http1/http2 union, but the default node-server config is a plain
// http.Server (which is what emits 'upgrade'), so narrow it here.
const hub: SyncHub = attachSync(server as unknown as Server, store);
// Route the SMS webhook's events through the hub so they broadcast to peers.
publish = hub.publish;

// Drop expired events periodically so the cache stays bounded on a long-running
// relay. `.unref()` keeps this timer from holding the process open on its own.
const PRUNE_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => {
  const removed = store.prune(Math.floor(Date.now() / 1000));
  if (removed > 0) console.log(`[setu-relay] pruned ${removed} expired events`);
}, PRUNE_INTERVAL_MS).unref();
