# Supabase setup

Everything the app needs on the backend. Run these once after creating a Supabase
project. Nothing here is automated — no credentials are committed.

## 1. Apply the schema and policies

In the Supabase dashboard → **SQL Editor**, run in order:

1. [`schema.sql`](./schema.sql) — tables (`sets`, `collectibles`) and indexes.
2. [`policies.sql`](./policies.sql) — enables RLS, adds owner-only policies, and
   creates the private `collectible-images` Storage bucket with owner-scoped policies.

(Or with the CLI: `supabase db execute --file supabase/schema.sql`, then `policies.sql`.)

## 2. Configure Auth

Under **Authentication → URL Configuration**, add both app origins so email/password
and magic-link redirects resolve:

- **Site URL:** the desktop app origin (e.g. `https://app.example.com`).
- **Redirect URLs (allow-list):** add `https://app.example.com/auth/callback` and
  `https://m.example.com/auth/callback`, plus `http://localhost:5173/auth/callback`
  for local dev. The client sends users to `/auth/callback` after a magic link.

Email/password and magic link are both enabled by default. Decide whether to require
email confirmation on sign-up under **Authentication → Providers → Email**.

## 3. Client env

Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` (the `sb_publishable_…` key from **Project Settings →
API keys**). Never use the secret key in the client.

## Notes

- **Signed URLs:** thumbnails are served via 1-hour signed URLs generated on load, so
  the bucket stays private.
- **Deletes leave Storage objects in place** (only DB rows are removed) so an undo can
  restore a record against the surviving object. A periodic job could later delete
  objects with no referencing row.
