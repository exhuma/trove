import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Two tailored builds — a richer desktop UI and a lighter mobile UI — share one
// core (src/core) and one Supabase backend. `APP` selects which shell to serve or
// build; each has its own root, dev server, public/ (for _redirects), and dist/.
const APPS = ['desktop', 'mobile'] as const
type App = (typeof APPS)[number]

const app = (process.env.APP ?? 'desktop') as App
if (!APPS.includes(app)) {
  throw new Error(`APP must be one of ${APPS.join(', ')} — got "${process.env.APP}"`)
}

export default defineConfig({
  // Relative asset URLs so the bundle works under any Cloudflare Pages path.
  base: './',
  root: fileURLToPath(new URL(`./src/apps/${app}`, import.meta.url)),
  plugins: [vue()],
  resolve: {
    alias: {
      '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
    },
  },
  build: {
    outDir: fileURLToPath(new URL(`./dist/${app}`, import.meta.url)),
    emptyOutDir: true,
  },
})
