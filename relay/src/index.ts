import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolved relative to this file (relay/src/index.ts -> ../../app/dist) so it
// works unchanged whether run via `tsx` from source (local dev, node:local)
// or from the Docker image, as long as that same repo layout is preserved.
// STATIC_DIR can still override it (e.g. an unusual deploy layout).
const __dirname = dirname(fileURLToPath(import.meta.url));
const STATIC_DIR = resolve(process.env.STATIC_DIR ?? join(__dirname, '../../app/dist'));
const INDEX_HTML = join(STATIC_DIR, 'index.html');
const hasBuiltApp = existsSync(INDEX_HTML);

const app = new Hono();

app.get('/healthz', (c) => c.json({ ok: true }));

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

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[setu-relay] listening on http://localhost:${info.port}`);
  console.log(hasBuiltApp ? `[setu-relay] serving app from ${STATIC_DIR}` : '[setu-relay] app/dist not found — static serving disabled');
});
