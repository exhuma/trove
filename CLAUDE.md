# CLAUDE.md

Guidance for AI agents working in this repo. Read this first; for the full map
see [`docs/architecture.md`](./docs/architecture.md).

## What Trove is

A personal **collection tracker** (Vue 3 + TS PWA, Vite, Tailwind, Supabase).
Users create **sets** and fill them with **collectibles**, tracking copies
**owned** vs a **target** (a Magic playset is 4). A **Needs** view lists what's
still short. It's MTG-themed — add a card by searching Scryfall, or a **booster /
sealed product** from the vendored catalogue — but the domain is modelled
generically — *set* / *collectible*, never *card* / *deck*.

## Commands

Use `Taskfile.yml` (wraps the npm scripts, loads `.env`):

| Command | Does |
| --- | --- |
| `task install` | `npm ci` |
| `task dev` | dev server on `:5173` (`npm run dev`) |
| `task build` | typecheck **then** `vite build` → `dist/` |
| `task preview` | build, then serve `dist/` |
| `task deploy` | build, then deploy to Cloudflare Pages |

**There is no test suite and no linter.** The only quality gate is
`npm run typecheck` (`vue-tsc --noEmit`), which `build` runs first. If asked to
"run the tests", run the typecheck. (Playwright is a devDependency but unused.)

To run locally with **no Supabase project, network, or login**, put
`VITE_BACKEND=memory` in `.env.local` and `task dev` (dev-only; dead code in any
production build).

## Where things live

- **`src/core/`** — framework-light shared layer: domain types, data access,
  auth, external APIs, business logic in composables, a few shared components.
  Import it via the **`@core`** alias, never relative `../../core`.
  - **`src/core/catalog/`** — the pluggable **catalogue-source** seam. Each source
    (Scryfall cards, boosters) implements `CatalogSource`; add one to
    `CATALOG_SOURCES` and a new tab appears in the add-collectible dialog. The
    booster source searches `src/core/data/boosters.json` (vendored, offline), then
    its optional `refine` step offers the set's card arts (a booster's art is a
    card variant) in collector order — with the set symbol as a fallback.
- **`src/app/`** — the Vue UI shell (Vite `root`): `index.html`, `main.ts`,
  `router.ts`, `App.vue`, `views/`, `components/`, `public/`.
- **`supabase/`** — versioned schema as Supabase CLI migrations (`config.toml`,
  `migrations/`). No local Docker stack; migrations are applied to the live
  project via `task db:push`. See `supabase/README.md`.

The single seam to persistence is `CollectionRepository`
(`src/core/data/repository.ts`); the heart of the app is
`src/core/composables/useCollection.ts`. See `docs/architecture.md` for the full
module map.

## Conventions (follow these)

- `<script setup lang="ts">` + Composition API; typed `defineProps` /
  `defineEmits`. Props down, events up — views own state, children emit intent.
- **No state library.** State is module-scope singleton `ref`s inside
  composables (`useCollection`, `useNeeds`, `useToast`, `auth`). Don't add Pinia.
- **Never import Supabase in UI code.** Components talk to `useCollection`, which
  talks to `repo`. That's the only path to persistence.
- **Tailwind only** — no `<style>` blocks (global CSS is only `core/style.css`).
  Use the **semantic colour tokens** in `tailwind.config.js` (`hall`, `violet`,
  `amber`, `ink`, `danger`): **no hex literals anywhere in `src/`**.
- New modals build on `BaseOverlay` and route a11y through `useModalA11y`.
- Mobile-first responsive, **no device detection** (`sm:` = desktop). Dark theme
  only.

## Gotchas (don't "fix" these — see `docs/architecture.md` for the why)

- **Scryfall CORS cache-buster** (`catalog/scryfall.ts`, `catalog/boosters.ts`):
  the `?cors=<ts>` param dodges a poisoned CDN cache entry. Don't remove it.
- **Booster catalogue is vendored, not live** (`src/core/data/boosters.json`,
  built by `scripts/build-booster-catalog.mjs` = `npm run build:boosters`). Search
  is offline and in-memory; regenerate when new sets release. Don't fetch it live.
- **Set symbols are rasterised onto a light "coin"** (`image.ts svgToStorableBlob`):
  Scryfall's symbol SVGs are black and would vanish on the dark tiles, and
  `createImageBitmap` is unreliable for SVG — hence the `<img>`-to-canvas path.
- **Deletes never remove Storage objects** — only DB rows. Undo relies on the
  object surviving.
- **`exact-active-class`, not `active-class`** on RouterLinks (`/` prefixes every
  route).
- **Security is RLS, not key secrecy.** The publishable key is public by design;
  **never** put the secret/service-role key in any `VITE_` var.
- **`PAGES_PROJECT`** is the Cloudflare *project name*, not the `.pages.dev`
  subdomain — a wrong value silently deploys to a new project.

## Quartermaster

Quartermaster serves versioned instruction kits as on-demand context. It's a
**per-task, standing behaviour, not one-time setup**: on any prompt that asks you
to make or plan a change — and again whenever the work shifts to a new subsystem
or resumes after a context compaction — call `resolve_kits(task="…")` **before
editing**.

**Stack caveat (important).** Quartermaster's catalogue is Python/backend
oriented (Sphinx, Postgres/Alembic, FastAPI, Docker Taskfiles). Those
stack-specific kits **do not apply** to this Vue 3 + TS + Supabase PWA — ignore
them. Only the **tech-agnostic** kits are relevant here: `module-documentation`,
`module-design-principles`, `module-testing-strategy`, `module-api-design`.
Treat kit output as advisory and reconcile it against this repo's own
conventions, **which win on conflict** (e.g. this repo has no test suite and uses
Tailwind, not RST/Sphinx).

## Pointers

- [`docs/architecture.md`](./docs/architecture.md) — full module map, data model,
  workflows, gotchas.
- [`docs/deployment.md`](./docs/deployment.md) — build & deploy.
- [`supabase/README.md`](./supabase/README.md) — backend setup.
- [`.env.example`](./.env.example) — env var reference.
