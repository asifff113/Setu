import { serve } from '@hono/node-server';
import { Hono } from 'hono';

const app = new Hono();

app.get('/healthz', (c) => c.json({ ok: true }));
app.get('/', (c) =>
  c.text('Setu relay is running. Static app serving + /ws sync land in later phases.'),
);

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[setu-relay] listening on http://localhost:${info.port}`);
});
