/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';
import { devApi } from './server/devApi';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

// Source lives in app/. `npm run build` writes the site to dist/ (what Netlify
// publishes). `npm run deploy` copies it to the repository root, which GitHub
// Pages serves from https://insaneinthewaynebrain.github.io/hp-calc/.
//
// Server functions live in netlify/functions (thin wrappers around server/).
// In `npm run dev` the devApi plugin serves the same code at /api/*.
//
// base: './' makes every asset, the manifest and the service worker use
// relative URLs, so the site works from the /hp-calc/ sub-folder (or any other).
export default defineConfig({
  root: 'app',
  base: './',
  // Only VITE_* variables ever reach the browser; secrets stay on the server.
  envDir: '..',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  plugins: [
    react(),
    devApi(projectRoot),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: './',
        name: 'Car Finance',
        short_name: 'Car Finance',
        description: 'Personal hire purchase calculator',
        theme_color: '#0f1115',
        background_color: '#0f1115',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        // Never serve lookups from the offline cache.
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: { enabled: true },
    }),
  ],
  test: {
    root: '.',
    include: ['app/src/**/*.test.ts', 'server/**/*.test.ts'],
    environment: 'node',
  },
});
