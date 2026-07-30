/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', 'dist/**', 'dev-dist/**'],
    },
  },
  server: {
    // Dev convenience: proxy the sync socket to a locally-running relay so
    // `npm run dev` (5173) + `npm run dev:relay` (8787) sync end-to-end.
    proxy: {
      '/ws': { target: 'ws://localhost:8787', ws: true },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        id: '/',
        name: 'সেতু Setu',
        short_name: 'Setu',
        description: 'Offline-first crisis communication',
        lang: 'bn',
        theme_color: '#e5322d',
        background_color: '#121212',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: "I'm SAFE",
            short_name: 'SAFE',
            url: '/?action=safe',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Request help',
            short_name: 'Help',
            url: '/?action=help',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // App must still load from cache with the network unreachable.
        navigateFallback: '/index.html',
        // …but these are relay-owned routes, not SPA routes. Without this, an
        // installed PWA could serve index.html over a navigation to /lite or the
        // SMS simulator instead of letting the relay answer. API/health/ws are
        // never navigations, but denylisting them is belt-and-suspenders.
        navigateFallbackDenylist: [
          /^\/lite/,
          /^\/sms-sim/,
          /^\/node-qr/,
          /^\/api\//,
          /^\/healthz/,
          /^\/ws/,
        ],
        runtimeCaching: [
          {
            // OSM raster tiles (Map screen). CacheFirst + a bounded LRU so a
            // laptop/phone that has browsed an area once can show it again
            // with no network; the 200-tile cap keeps this from growing
            // unbounded on a device that pans around the whole country.
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
});
