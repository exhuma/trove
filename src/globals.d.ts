/// <reference types="vite-plugin-pwa/vue" />

// Build-time constants injected by Vite's `define` (see vite.config.ts). Read them
// through `@core/version`, never directly, so there is one typed access point.
declare const __APP_VERSION__: string
declare const __APP_CHANNEL__: string
declare const __APP_COMMIT__: string
