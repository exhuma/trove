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

One build, one Pages project — a single responsive app (`src/app/`) adapts its UI to
the viewport (a hover-rich desktop layout that degrades to bottom sheets, a floating
action button, and larger touch targets on phones) over the shared `src/core/` and one
Supabase backend:

| Build | Output | Pages project |
| --- | --- | --- |
| `task build` | `dist` | `$PAGES_PROJECT` |

The app ships a `public/_redirects` (`/* /index.html 200`) so client-side routes
survive a hard refresh.

> **Retiring `trove-mobile`.** This project previously shipped a separate mobile
> bundle to its own Pages project (`trove-mobile`). It has been folded into the one
> responsive site. If that project had a live URL, redirect it to the unified site and
> drop the mobile origin from Supabase's Auth redirect allow-list; keep the `trove`
> origin (and any custom domain) as the Site URL.

## Bootstrap (once)

Nothing below is automated — no accounts or credentials are committed.

1. **Supabase project.** Create one, then follow [`supabase/README.md`](../supabase/README.md):
   link the Supabase CLI (`supabase link`), push the migrations (`task db:push`)
   — or, since this project predates migrations, mark the baseline applied per the
   README — and add every app origin plus `http://localhost:5173/auth/callback` to
   the Auth redirect allow-list.
2. **Local env.** `cp .env.example .env` and fill in `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY` (the `sb_publishable_…` key — never the secret one).
3. **Cloudflare Pages project.** Create one *direct upload* project (no Git
   integration; Wrangler pushes the built files). Its name goes in `.env` as
   `PAGES_PROJECT`.
4. **Cloudflare auth.** `npx wrangler login` once, or export `CLOUDFLARE_API_TOKEN`
   (Pages → Edit permission) for CI.
5. **First deploy.** `task deploy`.
6. **Back to Supabase.** Add the live Pages URL (and any custom domain) to the
   Auth redirect allow-list, and set it as the Site URL.

## Routine deploy

```sh
task deploy            # build + deploy
```

The deploy rebuilds first, so the deployed bundle always matches the current `.env`
and working tree. To check the bundle before shipping it: `task preview`.
