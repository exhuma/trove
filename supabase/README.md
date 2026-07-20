# Supabase setup

Everything the app needs on the backend. The schema is managed as **versioned
migrations** under [`migrations/`](./migrations), driven by the Supabase CLI
(pinned as a devDependency and wrapped by the `db:*` tasks in `Taskfile.yml`).
There is **no local Docker stack** — migrations are authored as SQL and applied
directly to the live project. No credentials are committed.

- [`config.toml`](./config.toml) — Supabase CLI project config (needed for
  `link` / `db push`). Committed.
- [`migrations/`](./migrations) — ordered `<timestamp>_*.sql` files; the source of
  truth for the schema. The baseline `…_initial_schema.sql` creates the `sets` and
  `collectibles` tables, indexes, RLS policies, and the private `collectible-images`
  Storage bucket.

For a backend-free local UI loop, use `VITE_BACKEND=memory` (see `.env.example`).

## One-time: link + adopt the existing live project

The live project already has the baseline schema (it was applied by hand before
migrations existed), so **mark the baseline as already applied** instead of
re-running it — otherwise `db push` would try to recreate existing objects.

```sh
npx supabase link --project-ref <ref>
npx supabase migration repair --status applied 20260718215432
task db:status      # local + remote should both list 20260718215432 as applied
```

`link` / `db push` authenticate with a `SUPABASE_ACCESS_TOKEN` in your environment
(plus the DB password when prompted); never put those in a `VITE_` var or commit
them.

## Changing the schema

```sh
task db:new -- add_something   # scaffold supabase/migrations/<ts>_add_something.sql
# …write the SQL by hand…
task db:push                   # apply pending migrations to the linked live project
task db:status                 # confirm local and remote history are in sync
```

Review migrations carefully before pushing: there is no local stack to rehearse
against, so `db push` runs them straight at the live database. (If you do have
Docker on your own machine, `supabase db diff` can autogenerate a migration from
schema changes — optional, not required.) Deploying the frontend (`task deploy`)
never touches the database — schema changes ship separately via `db:push`.

## Configure Auth (live project)

Under **Authentication → URL Configuration**, add both app origins so
email/password and magic-link redirects resolve:

- **Site URL:** the app origin (e.g. `https://app.example.com`).
- **Redirect URLs (allow-list):** add `https://app.example.com/auth/callback`,
  plus `http://localhost:5173/auth/callback` for local dev. The client sends users
  to `/auth/callback` after a magic link.

Email/password and magic link are both enabled by default. Decide whether to
require email confirmation on sign-up under **Authentication → Providers → Email**.

### Manual identity linking (for the Account dialog)

Letting a signed-in user attach a social provider whose email differs from their
account requires **manual linking** to be enabled: **Authentication → Sign In /
Providers** (advanced) → **Manual linking** (`security_manual_linking_enabled`).
Without it, `linkIdentity()` returns a `Manual linking is disabled` error and the
feature is inert. See [`../docs/account-linking.md`](../docs/account-linking.md).

## Client env

Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` (the `sb_publishable_…` key from **Project
Settings → API keys**). Never use the secret key in the client.

## Notes

- **Signed URLs:** thumbnails are served via 1-hour signed URLs generated on load,
  so the bucket stays private.
- **Deletes leave Storage objects in place** (only DB rows are removed) so an undo
  can restore a record against the surviving object. A periodic job could later
  delete objects with no referencing row.
