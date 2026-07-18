/**
 * Selects an in-memory backend for local development loops, so the app can run
 * with no Supabase project, credentials, or network at all.
 *
 * Reserved for development: the flag is ANDed with `import.meta.env.DEV`, which
 * Vite sets to `false` for every `vite build`. A shipped production bundle
 * therefore always uses Supabase, no matter what `VITE_BACKEND` is set to — the
 * in-memory path is dead code once built.
 *
 * Opt in for a dev run with `VITE_BACKEND=memory` (see `.env.example`). When on,
 * persistence is in-memory (cleared on hard reload) and auth is a stub session,
 * so there is no login step. When off (the default), both fall back to Supabase.
 */
export const useMemoryBackend = import.meta.env.DEV && import.meta.env.VITE_BACKEND === 'memory'
