import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// One responsive build served everywhere: the app in src/app adapts its UI to the
// viewport (a centered, hover-rich desktop layout that degrades to bottom sheets,
// a floating action button, and larger touch targets on phones). It shares src/core
// (data, auth, composables) and one Supabase backend.
export default defineConfig({
  // Relative asset URLs so the bundle works under any Cloudflare Pages path.
  base: './',
  root: fileURLToPath(new URL('./src/app', import.meta.url)),
  plugins: [vue()],
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
