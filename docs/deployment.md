# Deployment

## The choice

Both apps are **static bundles on Cloudflare Pages**, talking directly to a managed
**Supabase** project. There is no server of our own.

Why this shape:

- The apps are pure client-side Vue — a build produces plain files, so a CDN is all
  that is needed. No runtime, no container, no scaling story.
- Supabase already provides the parts that would otherwise need a backend: Postgres,
  auth, and Storage. Per-user isolation is enforced in the database by RLS, not by an
  API layer we maintain, so the browser can hold the publishable key safely.
- Deliberately *not* served from Supabase Storage: Pages gives a proper CDN, custom
  domains, and SPA routing without extra work.

Consequence: `dist/` is the deployable artifact, and both `VITE_` env vars are baked
into it at build time. A change of Supabase project means a rebuild, not a config flip.

Two builds, two Pages projects — the richer desktop UI and the lighter mobile UI share
`src/core/` and one Supabase backend, but ship separately:

| App | Build | Output | Pages project |
| --- | --- | --- | --- |
| desktop | `task build:desktop` | `dist/desktop` | `$DESKTOP_PAGES_PROJECT` |
| mobile | `task build:mobile` | `dist/mobile` | `$MOBILE_PAGES_PROJECT` |

Each app ships a `public/_redirects` (`/* /index.html 200`) so client-side routes
survive a hard refresh.

## Bootstrap (once)

Nothing below is automated — no accounts or credentials are committed.

1. **Supabase project.** Create one, then follow [`supabase/README.md`](../supabase/README.md):
   run `schema.sql` and `policies.sql`, and add every app origin plus
   `http://localhost:5173/auth/callback` to the Auth redirect allow-list.
2. **Local env.** `cp .env.example .env` and fill in `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY` (the `sb_publishable_…` key — never the secret one).
3. **Cloudflare Pages projects.** Create two *direct upload* projects (no Git
   integration; Wrangler pushes the built files). Their names go in `.env` as
   `DESKTOP_PAGES_PROJECT` / `MOBILE_PAGES_PROJECT`.
4. **Cloudflare auth.** `npx wrangler login` once, or export `CLOUDFLARE_API_TOKEN`
   (Pages → Edit permission) for CI.
5. **First deploy.** `task deploy`.
6. **Back to Supabase.** Add the two live Pages URLs (and any custom domains) to the
   Auth redirect allow-list, and set the desktop origin as the Site URL.

## Routine deploy

```sh
task deploy            # build + deploy both
task deploy:desktop    # or just one
task deploy:mobile
```

Each target rebuilds first, so the deployed bundle always matches the current `.env`
and working tree. To check a bundle before shipping it: `task preview`.
