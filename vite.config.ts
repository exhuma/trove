import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// One responsive build served everywhere: the app in src/app adapts its UI to the
// viewport (a centered, hover-rich desktop layout that degrades to bottom sheets,
// a floating action button, and larger touch targets on phones). It shares src/core
// (data, auth, composables) and one Supabase backend.
export default defineConfig({
  // Relative asset URLs so the bundle works under any Cloudflare Pages path.
  base: './',
  root: fileURLToPath(new URL('./src/app', import.meta.url)),
  plugins: [
    vue(),
    // Make Trove installable to a phone/desktop home screen and let its shell
    // load offline. Scope is app-shell only: the UI is precached, but live data
    // (Supabase auth + collection, Scryfall) is left to the network on purpose.
    VitePWA({
      registerType: 'autoUpdate',
      // Auto-inject the SW registration so no source module imports
      // 'virtual:pwa-register' — keeps the vue-tsc typecheck free of PWA wiring.
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
        // SPA fallback for client-side routes, mirroring dist/_redirects.
        navigateFallback: 'index.html',
      },
      // Served at the Cloudflare Pages domain root; relative start_url/scope keep
      // the manifest valid under base: './'.
      manifest: {
        name: 'Trove',
        short_name: 'Trove',
        description: 'Your Magic: The Gathering collection, organised.',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        theme_color: '#0a090f',
        background_color: '#0a090f',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
    },
  },
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: true,
  },
})
