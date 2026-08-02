import { serve } from '@hono/node-server';
import { getConnInfo } from '@hono/node-server/conninfo';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { createHash, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import type { Server } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRelayIdentity } from './identity.js';
import { litePage } from './lite.js';
import { isPrivateHost } from './net.js';
import { nodeQrPage } from './nodeqr.js';
import { createRateLimiter } from './ratelimit.js';
import { gatewayFromEnv, handleInboundSms } from './sms.js';
import { smsSimPage } from './smssim.js';
import { EventStore } from './store.js';
import { attachSync, type SyncHub } from './sync.js';
import { dashboardPage, eventCsv } from './dashboard.js';
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
const isProduction = process.env.NODE_ENV === 'production';

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
const smsSimKey = process.env.SMS_SIM_KEY?.trim() || undefined;
const smsRateLimit = Number(process.env.SMS_RATE_LIMIT ?? 30);
const smsRateWindowMs = Number(process.env.SMS_RATE_WINDOW_MS ?? 60_000);
const smsLimiter = createRateLimiter(smsRateLimit, smsRateWindowMs);
const blobLimiter = createRateLimiter(
  Number(process.env.BLOB_RATE_LIMIT ?? 30),
  Number(process.env.BLOB_RATE_WINDOW_MS ?? 60_000),
);
const MAX_SMS_BODY_BYTES = 16 * 1024;
const MAX_BLOB_BYTES = 150_000;
const BLOB_HASH_RE = /^[A-Za-z0-9_-]{43}$/;
const BLOB_MIME = new Set(['image/webp', 'audio/webm', 'audio/ogg', 'application/octet-stream']);
const metricsKey = process.env.METRICS_KEY?.trim() || undefined;
const coordinatorKey = process.env.COORDINATOR_KEY?.trim() || undefined;

if (isProduction && !smsInboundKey) {
  throw new Error('SMS_INBOUND_KEY is required in production');
}
if (gateway.url && !smsInboundKey) {
  throw new Error('SMS_INBOUND_KEY is required when GATEWAY_URL is configured');
}
// Outbound SMS replies carry GATEWAY_KEY in an Authorization/API-key header
// (see sms.ts sendReply) — sending that over plaintext http:// leaks it to
// anyone on the path. Only exempt an explicit LAN/loopback gateway (a phone
// running the android-sms-gateway app on the same network) or an operator who
// has opted in knowingly.
if (gateway.url) {
  let gatewayHost: string | undefined;
  try {
    gatewayHost = new URL(gateway.url).hostname;
  } catch {
    throw new Error('GATEWAY_URL must be a valid URL');
  }
  const insecure = gateway.url.startsWith('http://');
  const allowInsecure = process.env.GATEWAY_ALLOW_INSECURE === '1';
  if (insecure && !isPrivateHost(gatewayHost) && !allowInsecure) {
    throw new Error(
      'GATEWAY_URL must use https:// for a non-LAN address (set GATEWAY_ALLOW_INSECURE=1 to override)',
    );
  }
}

/** Constant-time string compare so a wrong guess can't be timed byte-by-byte. */
function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/** Best-effort client identity for rate-limiting: Fly/proxy header, else socket. */
function clientKey(c: Context): string {
  const fly = c.req.header('fly-client-ip')?.trim();
  // Only trust this header when actually running on Fly — its proxy is what
  // strips/sets it. Off Fly (bare VPS, Render, local), it's just another
  // client-supplied header, so trusting it would let a client mint a fresh
  // rate-limit bucket per request by sending a random value.
  if (fly && process.env.FLY_APP_NAME) return fly;
  if (process.env.TRUST_PROXY === '1') {
    const xff = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
    if (xff) return xff;
  }
  try {
    return getConnInfo(c).remote.address ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

function smsAuthOk(c: Context): boolean {
  const sim = c.req.header('x-setu-sim-key')?.trim();
  if (smsSimKey && sim && timingSafeEqualStr(sim, smsSimKey)) return true;
  if (!smsInboundKey) return !isProduction && !gateway.url;
  const header = c.req.header('x-setu-key')?.trim();
  if (header && timingSafeEqualStr(header, smsInboundKey)) return true;
  const auth = c.req.header('authorization')?.trim();
  if (!auth) return false;
  return timingSafeEqualStr(auth, smsInboundKey) || timingSafeEqualStr(auth, `Bearer ${smsInboundKey}`);
}

function coordinatorAuthOk(c: Context): boolean {
  if (!coordinatorKey) return false;
  const auth = c.req.header('authorization')?.trim();
  if (!auth) return false;
  if (auth.startsWith('Bearer ')) return timingSafeEqualStr(auth.slice(7), coordinatorKey);
  if (auth.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8');
      return timingSafeEqualStr(decoded.split(':').slice(1).join(':'), coordinatorKey);
    } catch {
      return false;
    }
  }
  return false;
}

// Assigned once attachSync runs (after serve() below). Until then, and if the
// webhook is somehow hit mid-startup, fall back to ingest-only (no broadcast)
// so an inbound SMS is still stored rather than lost.
let publish: (events: SetuEvent[]) => SetuEvent[] = (events) =>
  store.ingest(events, Math.floor(Date.now() / 1000));

const BASE_CSP = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org'],
  connectSrc: ["'self'", 'ws:', 'wss:'],
  mediaSrc: ["'self'", 'blob:'],
  workerSrc: ["'self'", 'blob:'],
  objectSrc: ["'none'"],
  frameAncestors: ["'none'"],
};
const PERMISSIONS_POLICY = { camera: ['self'], microphone: ['self'], geolocation: ['self'] };

const app = new Hono();
// Registered before the global '*' policy below so its post-response header
// write (hono/secure-headers runs its `setHeaders` after `next()` resolves,
// outermost-registered-last) wins for this one route: /sms-sim is the only
// page with an inline <script> (see smssim.ts), so it's the only place that
// needs 'unsafe-inline' in script-src. The rest of the app — the actual PWA —
// keeps real XSS defense-in-depth with no inline scripts allowed.
app.use('/sms-sim', secureHeaders({
  contentSecurityPolicy: { ...BASE_CSP, scriptSrc: ["'self'", "'unsafe-inline'"] },
  referrerPolicy: 'no-referrer',
  permissionsPolicy: PERMISSIONS_POLICY,
}));
app.use('*', secureHeaders({
  contentSecurityPolicy: BASE_CSP,
  referrerPolicy: 'no-referrer',
  permissionsPolicy: PERMISSIONS_POLICY,
}));

// Public liveness/readiness probe: confirms the process is up AND the event
// store can actually be read/written, without leaking operational counts to
// anyone who can reach the port. See /metrics for authenticated numbers.
app.get('/healthz', (c) => {
  const ok = store.isWritable();
  return c.json({ ok }, ok ? 200 : 503);
});

// GET /metrics — operational counts, gated behind METRICS_KEY so a public
// relay doesn't hand out its event volume (and rough traffic shape) to
// anyone who asks. Unset (default) => disabled entirely.
app.get('/metrics', (c) => {
  if (!metricsKey) return c.json({ ok: false, error: 'metrics disabled' }, 404);
  const key = c.req.header('x-setu-metrics-key')?.trim();
  if (!key || !timingSafeEqualStr(key, metricsKey)) {
    return c.json({ ok: false, error: 'unauthorized' }, 401);
  }
  return c.json({ ok: true, events: store.count() });
});

// These non-SPA routes must be registered before the static catch-all below,
// otherwise the index.html fallback would swallow them.
app.get('/node-qr', async (c) => c.html(await nodeQrPage(port)));

// GET /lite — zero-JS read-only board (2G / Opera Mini fallback).
app.get('/lite', (c) => c.html(litePage(store)));

// GET /setu.apk — serve field-edition Android APK for offline distribution.
const APK_PATH = process.env.APK_PATH ?? resolve(__dirname, '../../app/android/app/build/outputs/apk/field/release/app-field-release.apk');
app.get('/setu.apk', (c) => {
  if (!existsSync(APK_PATH)) {
    return c.text('APK file not found on relay server', 404);
  }
  const apkBytes = readFileSync(APK_PATH);
  c.header('content-type', 'application/vnd.android.package-archive');
  c.header('content-disposition', 'attachment; filename="setu-field.apk"');
  return c.body(Uint8Array.from(apkBytes));
});

app.get('/dashboard', (c) => {
  if (!coordinatorKey) return c.text('Not found', 404);
  if (!coordinatorAuthOk(c)) {
    c.header('www-authenticate', 'Basic realm="Setu coordinator"');
    return c.text('Authentication required', 401);
  }
  return c.html(dashboardPage(store.allLive(Math.floor(Date.now() / 1000))));
});

app.get('/api/coordinator/export.csv', (c) => {
  if (!coordinatorKey) return c.text('Not found', 404);
  if (!coordinatorAuthOk(c)) {
    c.header('www-authenticate', 'Basic realm="Setu coordinator"');
    return c.text('Authentication required', 401);
  }
  c.header('content-type', 'text/csv; charset=utf-8');
  c.header('content-disposition', `attachment; filename="setu-live-${new Date().toISOString().slice(0, 10)}.csv"`);
  c.header('cache-control', 'no-store');
  return c.text(eventCsv(store.allLive(Math.floor(Date.now() / 1000))));
});

// GET /sms-sim — fake-phone demo posting to the webhook below. The simulator
// key (if any) is typed into the page's own field, never embedded in the
// HTML. Disabled by default in production — a demo/testing surface has no
// business being reachable on a real deploy unless the operator explicitly
// opts in by setting SMS_SIM_KEY.
app.get('/sms-sim', (c) => {
  if (isProduction && !smsSimKey) return c.text('Not found', 404);
  return c.html(smsSimPage());
});

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
  // Chunked-encoded requests carry no Content-Length (the two are mutually
  // exclusive per HTTP/1.1), so requiring the header up front rejects them
  // outright instead of buffering an attacker-controlled, unbounded body into
  // memory before the size check below ever runs.
  const contentLengthHeader = c.req.header('content-length');
  if (!contentLengthHeader) {
    return c.json({ ok: false, error: 'content-length required' }, 411);
  }
  const contentLength = Number(contentLengthHeader);
  if (!Number.isFinite(contentLength) || contentLength > MAX_SMS_BODY_BYTES) {
    return c.json({ ok: false, error: 'payload too large' }, 413);
  }
  let body: unknown;
  try {
    const text = await c.req.text();
    if (new TextEncoder().encode(text).length > MAX_SMS_BODY_BYTES) {
      return c.json({ ok: false, error: 'payload too large' }, 413);
    }
    body = JSON.parse(text);
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

// GET /api/sms/outbound — authenticated pull endpoint for phone SMS gateways
app.get('/api/sms/outbound', (c) => {
  if (!smsAuthOk(c)) {
    return c.json({ ok: false, error: 'unauthorized' }, 401);
  }
  return c.json({ ok: true, messages: [] });
});

// Attachments are content-addressed and deliberately separate from the signed
// event stream. They never enter QR/chirp/SMS packets; devices fetch them only
// after an explicit tap. The hash is verified before storage, making PUT
// idempotent and preventing a relay from serving bytes different from the
// event's signed pointer.
app.put('/api/blob/:hash', async (c) => {
  if (!blobLimiter.allow(clientKey(c))) {
    return c.json({ ok: false, error: 'rate limited' }, 429);
  }
  const hash = c.req.param('hash');
  if (!BLOB_HASH_RE.test(hash)) return c.json({ ok: false, error: 'invalid hash' }, 400);
  const lengthText = c.req.header('content-length');
  if (!lengthText) return c.json({ ok: false, error: 'content-length required' }, 411);
  const length = Number(lengthText);
  if (!Number.isSafeInteger(length) || length < 1 || length > MAX_BLOB_BYTES) {
    return c.json({ ok: false, error: 'payload too large' }, 413);
  }
  const mime = (c.req.header('content-type') ?? 'application/octet-stream').split(';')[0]!.trim();
  if (!BLOB_MIME.has(mime)) return c.json({ ok: false, error: 'unsupported media type' }, 415);
  const bytes = Buffer.from(await c.req.arrayBuffer());
  if (bytes.length !== length || bytes.length > MAX_BLOB_BYTES) {
    return c.json({ ok: false, error: 'invalid payload length' }, 400);
  }
  const actual = createHash('sha256').update(bytes).digest('base64url');
  if (actual !== hash) return c.json({ ok: false, error: 'hash mismatch' }, 400);
  const added = store.putAttachment(hash, bytes, mime, Math.floor(Date.now() / 1000));
  return c.json({ ok: true, added }, added ? 201 : 200);
});

app.get('/api/blob/:hash', (c) => {
  const hash = c.req.param('hash');
  if (!BLOB_HASH_RE.test(hash)) return c.json({ ok: false, error: 'invalid hash' }, 400);
  const attachment = store.getAttachment(hash);
  if (!attachment) return c.json({ ok: false, error: 'not found' }, 404);
  c.header('content-type', attachment.mime);
  c.header('content-length', String(attachment.bytes.length));
  c.header('cache-control', 'public, max-age=31536000, immutable');
  c.header('x-content-type-options', 'nosniff');
  return c.body(Uint8Array.from(attachment.bytes));
});

// Read once at boot rather than on every SPA navigation — the file doesn't
// change while the process is running.
const indexHtml = hasBuiltApp ? readFileSync(INDEX_HTML, 'utf-8') : null;

if (hasBuiltApp) {
  // Real files (JS/CSS/fonts/icons/manifest/sw.js) are served as-is; any path
  // that doesn't match one (e.g. a client-side route like /board) falls
  // through to index.html so React Router can take over — the standard SPA
  // serving pattern.
  app.use('/*', serveStatic({ root: STATIC_DIR }));
  app.get('*', (c) => c.html(indexHtml!));
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
    `[setu-relay] sms webhook ${smsInboundKey ? 'requires SMS_INBOUND_KEY' : 'local demo mode only'}, ` +
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
const pruneTimer = setInterval(() => {
  const removed = store.prune(Math.floor(Date.now() / 1000));
  if (removed > 0) console.log(`[setu-relay] pruned ${removed} expired events`);
}, PRUNE_INTERVAL_MS).unref();

// Graceful shutdown: stop taking new work, let in-flight requests finish,
// then release the WS peers, the prune timer, and the SQLite handle — a
// relay that's `kill`ed or redeployed mid-sync shouldn't corrupt its DB file
// or leave phones spinning against a socket that's never coming back.
const SHUTDOWN_TIMEOUT_MS = 5000;
let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[setu-relay] ${signal} received, shutting down...`);
  clearInterval(pruneTimer);
  hub.close();
  const forceExit = setTimeout(() => {
    console.log('[setu-relay] shutdown timed out, forcing exit');
    process.exit(0);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();
  server.close(() => {
    clearTimeout(forceExit);
    try {
      store.close();
    } catch {
      /* already closed */
    }
    process.exit(0);
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
