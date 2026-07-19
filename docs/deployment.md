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

## Custom domain

The app needs **no code changes** to serve from a custom domain: assets are
relative (`base: './'`), the PWA manifest's `start_url`/`scope` are relative, and
the auth callback is derived at runtime from `window.location.origin`. Serving from
`https://trove.albert.lu` therefore just works once the two settings below are in
place.

1. **Cloudflare Pages → the `trove` project → Custom domains → Set up a domain.**
   Add `trove.albert.lu`. Cloudflare gives you a DNS target; add the matching
   record in the `albert.lu` zone (a `CNAME` to the project's `*.pages.dev`
   hostname, or Cloudflare wires it automatically if the zone is on the same
   account). `PAGES_PROJECT` stays `trove` — you are adding a hostname to the same
   project, not creating a new one.
2. **Supabase dashboard → Authentication → URL Configuration.** Set **Site URL** to
   `https://trove.albert.lu` and add `https://trove.albert.lu/auth/callback` to the
   redirect allow-list. Keep the existing `trove-c9g.pages.dev` origin and the
   `http://localhost:5173/auth/callback` dev entry so both keep working.

## Release & versioning

Releases follow **calendar versioning** and **git tags** — there is nothing to bump
in `package.json` to cut a release.

- **Scheme.** Tag releases `vYYYY.MM.MICRO` (e.g. `v2026.07.0`), pre-releases
  `vYYYY.MM.MICRO-beta.N` (or `-rc.N` / `-alpha.N`). `MICRO` resets per month.
- **How it surfaces.** `vite.config.ts` runs `git describe --tags` at build time and
  inlines the result as `__APP_VERSION__` / `__APP_CHANNEL__` / `__APP_COMMIT__`
  (read via `@core/version`). A tiny `AppVersion` component shows the version in the
  footer and on the login screen; a **channel chip** appears next to it for any
  non-production build (`beta`, `rc`, `alpha`, or `dev` for an untagged commit) and
  is hidden for a clean production tag. `VITE_APP_CHANNEL` can force the label (see
  `.env.example`). Everything degrades to the `package.json` version if git is
  unavailable, so the build never fails on this.
- **Cutting a release.** Tag, then deploy — the local `task deploy` build reads the
  tag off the working tree:

  ```sh
  git tag v2026.07.0        # or v2026.07.0-beta.1 for a pre-release
  task deploy
  ```

- **Beta environments.** The channel chip is an app-level lifecycle signal, not a
  separate backend. A genuinely isolated beta *database* would be Supabase
  **Branching** (a paid, dashboard-level feature with its own migration flow); it is
  deliberately **not** adopted here — the single live project plus the channel chip
  covers the need. Revisit Branching only if beta data must be kept off production.

## Database migrations

Schema changes ship as Supabase CLI migrations under `supabase/migrations/` and are
applied to the live project with `task db:push` (see
[`supabase/README.md`](../supabase/README.md)). The deploy never touches the DB, so
apply pending migrations **before** shipping a build that depends on them — e.g. the
`onboarding` table backing the first-run welcome and guided tour.
