/**
 * Build-time configuration, read from Vite's `import.meta.env`. Both values are
 * inlined into the bundle at `vite build`.
 *
 * `VITE_SUPABASE_PUBLISHABLE_KEY` (the `sb_publishable_…` key, formerly `anon`) is
 * public by design — it ships to every browser and per-user security comes from
 * Postgres RLS, not from hiding it. The secret key (`sb_secret_…`/service_role) must
 * NEVER be referenced here or in any `VITE_` var: it bypasses RLS and belongs only in
 * a server-side context.
 */

function required(name: string): string {
  const value = import.meta.env[name] as string | undefined
  // Fail loudly at boot rather than letting the Supabase client construct with an
  // undefined URL/key and fail later with an opaque network error.
  if (!value) {
    throw new Error(
      `Missing required build-time env var ${name}. Copy .env.example to .env and set ` +
        `VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY before building.`,
    )
  }
  return value
}

export const config = {
  supabaseUrl: required('VITE_SUPABASE_URL'),
  supabasePublishableKey: required('VITE_SUPABASE_PUBLISHABLE_KEY'),
} as const
