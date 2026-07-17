import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Everything is inlined into one index.html so the app can be opened straight
// from the filesystem: browsers refuse to load <script type="module" src="...">
// over file:// under CORS, but an inline module script runs fine.
export default defineConfig({
  base: './',
  plugins: [vue(), viteSingleFile()],
  build: {
    // Fonts and seed images must end up in the HTML rather than as sibling
    // files, so no asset stays below the inlining threshold.
    assetsInlineLimit: 100 * 1024 * 1024,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 8000,
  },
})
