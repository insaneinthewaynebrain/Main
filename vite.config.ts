/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Source lives in app/. `npm run build` writes the site to dist/, and
// `npm run deploy` copies it to the repository root, which GitHub Pages serves
// from https://insaneinthewaynebrain.github.io/Main/.
//
// base: './' makes every asset, the manifest and the service worker use
// relative URLs, so the site works from the /Main/ sub-folder (or any other).
export default defineConfig({
  root: 'app',
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  plugins: [
    react(),
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
        orientation: 'portrait',
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
      },
      devOptions: { enabled: true },
    }),
  ],
  test: {
    root: '.',
    include: ['app/src/**/*.test.ts'],
    environment: 'node',
  },
});
