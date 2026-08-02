/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA, type ManifestOptions } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
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
      disable: mode === 'native',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
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
          {
            name: 'Panic Mode',
            short_name: 'Panic',
            url: '/panic',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }],
          },
        ],
        share_target: {
          action: '/share-receive',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            files: [{ name: 'bundle', accept: ['application/octet-stream', '.setu'] }],
          },
        },
      } as Partial<ManifestOptions> & { share_target?: unknown },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
});
