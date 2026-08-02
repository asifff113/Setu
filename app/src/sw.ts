/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare let self: ServiceWorkerGlobalScope;

// registerType: 'autoUpdate' equivalent — new SW takes over immediately.
self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);

// SPA navigation fallback with the same relay-owned-route denylist as before
// (see the comment in vite.config.ts for why each entry exists).
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/lite/, /^\/sms-sim/, /^\/node-qr/, /^\/api\//, /^\/healthz/, /^\/ws/],
  }),
);

// OSM tile cache, identical to the old runtimeCaching entry.
registerRoute(
  ({ url }) => /^([abc])\.tile\.openstreetmap\.org$/.test(url.hostname),
  new CacheFirst({
    cacheName: 'osm-tiles',
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// Web Share Target: the OS POSTs the shared file here. Stash it in Cache
// Storage (the page and SW share it; no IndexedDB needed in the SW), then
// redirect to the Sync screen which ingests it.
const SHARE_INBOX = 'share-inbox';
const SHARE_KEY = '/share-inbox/bundle';

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.pathname === '/share-receive') {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const file = formData.get('bundle');
          if (file instanceof File) {
            const cache = await caches.open(SHARE_INBOX);
            await cache.put(SHARE_KEY, new Response(await file.arrayBuffer()));
          }
        } catch {
          // Fall through: the page will find no stashed bundle and show nothing.
        }
        return Response.redirect('/connect?shared=1', 303);
      })(),
    );
  }
});
