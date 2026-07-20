import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath, URL } from 'node:url'

// ── Build identity (CalVer, following git tags) ──────────────────────────────
// The displayed version follows git tags: releases are tagged `vYYYY.MM.MICRO`
// (pre-releases `vYYYY.MM.MICRO-beta.N`). We read it at build time via
// `git describe` and inline it through `define` below, so no manual package.json
// bump is needed to surface a release. Everything degrades gracefully when git
// is unavailable (e.g. a source tarball) — the build never fails on this.
function git(...args: string[]): string {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

function computeBuildInfo(): { version: string; channel: string; commit: string } {
  // e.g. "2026.07.0", "2026.07.0-beta.1", "2026.07.0-3-gb8c860b", or a bare SHA.
  const described = git('describe', '--tags', '--always', '--dirty').replace(/^v/, '')
  const pkgVersion = createRequire(import.meta.url)('./package.json').version as string
  const version = described || pkgVersion

  // Channel: an explicit env override wins; otherwise derive from the tag — a
  // pre-release token (beta/rc/alpha) names the channel, an exact clean tag is
  // production, and anything ahead of / without a tag is an untagged "dev" build.
  const override = process.env.VITE_APP_CHANNEL?.trim()
  const pre = /-(alpha|beta|rc)\b/i.exec(described)
  const channel = override
    ? override
    : pre
      ? pre[1].toLowerCase()
      : /^\d+\.\d+\.\d+$/.test(described)
        ? 'production'
        : 'dev'

  return { version, channel, commit: git('rev-parse', '--short', 'HEAD') }
}

const buildInfo = computeBuildInfo()

// One responsive build served everywhere: the app in src/app adapts its UI to the
// viewport (a centered, hover-rich desktop layout that degrades to bottom sheets,
// a floating action button, and larger touch targets on phones). It shares src/core
// (data, auth, composables) and one Supabase backend.
export default defineConfig({
  // Absolute asset URLs. The app is always served at the domain root (both the
  // .pages.dev origin and the custom domain), and relative URLs (base: './')
  // resolve against the current path depth — so a hard load of a nested route
  // like /auth/callback would request /auth/assets/… , which the SPA fallback
  // serves as index.html (text/html) and the browser rejects as a module script,
  // white-screening the page. Absolute paths resolve correctly at any depth.
  base: '/',
  root: fileURLToPath(new URL('./src/app', import.meta.url)),
  // Build identity, inlined at build time and read via `@core/version`.
  define: {
    __APP_VERSION__: JSON.stringify(buildInfo.version),
    __APP_CHANNEL__: JSON.stringify(buildInfo.channel),
    __APP_COMMIT__: JSON.stringify(buildInfo.commit),
  },
  plugins: [
    vue(),
    // Make Trove installable to a phone/desktop home screen and let its shell
    // load offline. Scope is app-shell only: the UI is precached, but live data
    // (Supabase auth + collection, Scryfall) is left to the network on purpose.
    VitePWA({
      // Prompt, not autoUpdate: a silently-swapped SW left the open page on the old
      // bundle until some later reload happened to catch it, which read as a stale
      // cache. Now UpdateBanner (via useRegisterSW) surfaces a waiting update and the
      // user opts in — no background page reloads, no polling.
      registerType: 'prompt',
      // We register the SW ourselves through `virtual:pwa-register/vue` in
      // UpdateBanner.vue, so disable auto-injection to avoid a double registration.
      // `src/globals.d.ts` references the plugin's client types to keep vue-tsc clean.
      injectRegister: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
        // SPA fallback for client-side routes, mirroring dist/_redirects.
        navigateFallback: 'index.html',
      },
      // Served at the Cloudflare Pages domain root; absolute start_url/scope match
      // base: '/' and keep the manifest anchored to the root.
      manifest: {
        name: 'Trove',
        short_name: 'Trove',
        description: 'Your Magic: The Gathering collection, organised.',
        start_url: '/',
        scope: '/',
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
