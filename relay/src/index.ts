import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { existsSync, readFileSync } from 'node:fs';
import type { Server } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRelayIdentity } from './identity.js';
import { nodeQrPage } from './nodeqr.js';
import { EventStore } from './store.js';
import { attachSync } from './sync.js';

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

const app = new Hono();

app.get('/healthz', (c) => c.json({ ok: true, events: store.count() }));

// /node-qr must be registered before the static catch-all below, otherwise the
// SPA fallback would swallow it.
app.get('/node-qr', async (c) => c.html(await nodeQrPage(port)));

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
attachSync(server as unknown as Server, store);

// Drop expired events periodically so the cache stays bounded on a long-running
// relay. `.unref()` keeps this timer from holding the process open on its own.
const PRUNE_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => {
  const removed = store.prune(Math.floor(Date.now() / 1000));
  if (removed > 0) console.log(`[setu-relay] pruned ${removed} expired events`);
}, PRUNE_INTERVAL_MS).unref();
