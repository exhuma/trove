# Architecture

This is the map an agent (or a new contributor) should read before touching the
code. It indexes what the codebase already documents in its own comments, so you
can jump straight to the right file instead of grepping. For how the app is
built and shipped, see [`deployment.md`](./deployment.md); for the backend, see
[`../supabase/README.md`](../supabase/README.md).

## Product overview

Trove is a personal **collection tracker**. A user signs in, creates **sets**,
and fills them with **collectibles**; each collectible tracks how many copies
are **owned** against a **target** (a Magic playset is 4). The app is themed for
Magic: The Gathering — you can add a collectible by searching Scryfall for a
card printing — but the domain is modelled generically on purpose: the code says
*set* and *collectible*, never *card* or *deck*.

Two views do the work. **Collection** shows your sets and, drilled in, one set's
collectibles with progress. **Needs** lists what you are still short of, so you
know what to hunt for.

You add a collectible three ways: upload a picture, search **Scryfall** for a card
printing, or search the **booster** catalogue (MTG sealed products). These are
`CatalogSource`s (`src/core/catalog/`) — the seam that keeps the domain generic
while the acquisition paths stay MTG-flavoured. Boosters have no Scryfall-style API
that serves artwork, so the catalogue is a **vendored MTGJSON/`magic-sealed-data`
list** searched offline; picking a booster then opens a **second step** to choose
its picture from that set's card arts (a booster's art is always a card variant),
in collector-number order, with the set symbol as a quick fallback.

> **Deliberately not present (yet).** No decks, no card metadata (mana cost,
> colour, rarity, price), no bulk import, no sharing. The `sets.visibility`
> column reserves room for public sharing later, but nothing is wired to it.

## Architecture at a glance

Trove is a pure client-side Vue 3 + TypeScript SPA (Vite, Tailwind), installable
as a PWA, talking directly to a managed Supabase backend (Postgres + Auth +
Storage). There is no server of our own; per-user isolation is enforced by
Postgres **RLS**, not by an API layer.

Three ideas carry most of the design:

- **`src/core` vs `src/app`.** `core` is the framework-light layer — domain
  types, data access, auth, external APIs, and business logic in composables,
  plus a few truly shared components. `app` is the Vue UI shell on top of it.
  `core` is imported via the **`@core`** alias (set in both `vite.config.ts` and
  `tsconfig.json`); never reach into it with relative `../../core` paths.
- **The repository seam.** `CollectionRepository`
  (`src/core/data/repository.ts`) is the single interface between the UI and
  persistence. Supabase-vs-in-memory is one swappable implementation behind it,
  and image resolution (Storage path → signed URL) is its job — so components
  never see Supabase or Storage details.
- **State is module-scope singleton refs.** There is no Pinia/Vuex. Each
  composable (`useCollection`, `useNeeds`, `useToast`, `auth`) declares its
  `ref`s at module scope, *outside* the `useX()` function, so every caller
  shares one instance. Follow this pattern instead of adding a store library.

```
src/
  core/                     # framework-light shared layer  (import as @core/…)
    types.ts                # Collectible, CollectibleSet
    config.ts               # reads VITE_ env; fails loud if missing
    supabase.ts             # the one Supabase client + IMAGE_BUCKET
    auth.ts                 # auth composable + session singleton + authReady
    image.ts                # downscale + WebP re-encode; set-symbol rasteriser
    dev-backend.ts          # useMemoryBackend flag (DEV-only)
    style.css               # Tailwind entry / global styles
    catalog/                # pluggable collectible-type sources (the seam)
      types.ts              #   CatalogSource / CatalogRefineStep / CatalogResult / SearchOutcome
      mtg-cards/            #   MTG cards — live Scryfall search + image fetch
      mtg-boosters/         #   MTG sealed products — offline search + searchable art refine
      index.ts              #   CATALOG_SOURCES registry (tab order)
    data/                   # persistence (repository pattern) + vendored data
      repository.ts         #   the CollectionRepository interface — the seam
      supabase-repository.ts#   production implementation
      memory-repository.ts  #   dev-only in-memory implementation
      onboarding-repository.ts # onboarding seam (welcome + seen-tip state)
      onboarding-supabase.ts   #   + onboarding-memory.ts implementations
      index.ts              #   picks impls from useMemoryBackend → `repo`, `onboardingRepo`
      boosters.json         #   vendored sealed-product catalogue (generated)
    composables/            # useCollection, useNeeds, useToast, useModalA11y
    components/             # CatalogFlow + CatalogStep + CatalogResultGrid, TroveMark, TroveWordmark
    version.ts              # build identity (CalVer/channel/commit) from git tags
  app/                      # the Vue UI shell — Vite `root` lives here
    index.html  main.ts  router.ts  App.vue
    views/                  # CollectionView, NeedsView, LoginView (+ landing), AuthCallbackView
    components/             # SetDetail, CollectibleTile, OwnedStepper, overlays, WelcomeOverlay, AppVersion, …
    composables/            # useAddSetPrompt, useOnboarding (app-only)
    onboarding/             # tour tip registry (tips.ts) + driver.js runner (runTour.ts)
    public/                 # favicon, PWA icons, _redirects
supabase/                   # config.toml, migrations/, README.md (Supabase CLI, no local stack)
```

## Data model

The app types are small (`src/core/types.ts`):

```ts
interface Collectible {
  id: string
  name: string
  image: string      // resolved signed Storage URL — what templates bind to :src
  imagePath: string  // Storage object key — the persisted source of truth
  owned: number      // copies in hand; >= 0
  target: number     // copies wanted; >= 1; complete once owned >= target
}
interface CollectibleSet {
  id: string
  name: string
  collectibles: Collectible[]
}
```

`image` vs `imagePath` is the key distinction: `imagePath` is what lives in the
database; `image` is a short-lived signed URL the repository produces at read
time. Templates only ever bind `image`.

Persistence is Supabase Postgres (schema in `supabase/migrations/`), **not**
localStorage/IndexedDB — the only things in localStorage are the Supabase auth
token and the Needs view's sort/group prefs (`trove:needs-view`).

| Table          | Key columns                                                    | Notes |
| --- | --- | --- |
| `sets`         | `id`, `user_id`, `name`, `visibility`, `created_at`            | `visibility` defaults `private`; `public` reserved for future sharing |
| `collectibles` | `id`, `set_id` (cascade), `user_id`, `name`, `image_path`, `owned`, `target`, `created_at` | `user_id` is denormalised so RLS is a bare `user_id = auth.uid()` with no join |

Images live in a **private** Storage bucket `collectible-images`
(`src/core/supabase.ts`), objects keyed `<uid>/<uuid>.webp`, served via 1-hour
signed URLs. The RLS policies in the migrations scope every row and every Storage
object to the owning user.

## Core modules — the map

Read the file's top-of-file doc comment first; nearly every non-obvious decision
has an inline rationale. This table points you at the right one.

| File | What it owns |
| --- | --- |
| `core/data/repository.ts` | The `CollectionRepository` interface — the one persistence seam. `NewCollectible` shape. |
| `core/data/supabase-repository.ts` | Production impl: Postgres CRUD + batch-signs Storage URLs (`SIGNED_URL_TTL = 1h`). |
| `core/data/memory-repository.ts` | Dev-only in-memory impl; uses object URLs for images. |
| `core/data/index.ts` | Exports the active `repo` and `onboardingRepo` singletons, chosen by `useMemoryBackend`. |
| `core/data/onboarding-repository.ts` | The `OnboardingRepository` seam + `OnboardingState` (`welcomeSeen`, `seenTips`); Supabase/memory impls alongside it. Backs the first-run welcome + guided tour; state is server-side per user, never localStorage. |
| `core/version.ts` | Build identity (`version`/`channel`/`commit`) inlined from git tags at build; `isPrerelease` drives the channel chip. See `vite.config.ts` `define`. |
| `app/composables/useOnboarding.ts` | Singleton onboarding state: non-throwing de-duped `ensureLoaded`, the welcome gate (`showWelcome`), and `startTour(view)` which persists only tips actually shown. |
| `app/onboarding/tips.ts` / `runTour.ts` | Declarative `TOUR_TIPS` registry + `selectTips` (essentials-first, capped); thin driver.js runner that anchors on the first *visible* `[data-tour]` match and reports shown keys. |
| `core/composables/useCollection.ts` | The heart. Optimistic CRUD with rollback; per-collectible debounced writes (`UPDATE_DEBOUNCE_MS = 400`); undo closures; `progressOf(set)` and `totals`. |
| `core/composables/useNeeds.ts` | Needs computation with **snapshot** semantics (below); sort/group prefs in localStorage. |
| `core/composables/useToast.ts` | Global toast queue; toasts carry an optional `undo` action — this is the undo UI. |
| `core/composables/useModalA11y.ts` | Escape-close, Tab focus-trap, focus restore; `capture` option for stacked modals. |
| `core/auth.ts` | Supabase email/password + magic-link; session singleton; the `authReady` promise the router awaits. |
| `core/catalog/types.ts` | The `CatalogSource` seam: a searchable "add" source (search + optional searchable `refine` step + fetch-a-storable-image) with its own UI copy. `CatalogResult` (with `label`/`fit` display hints) / `CatalogRefineStep` / `CatalogSearchOutcome`. |
| `core/catalog/mtg-cards/` | MTG single-card source: `searchCards` (`unique=art`, debounced, abortable) + `fetchImage` (full-card `normal`, CORS cache-buster). |
| `core/catalog/mtg-boosters/` | MTG booster source: offline search over vendored `boosters.json` (prefix-stripped `label`); searchable `refine` offers the set's card arts (`art_crop`, fetched once then filtered by card name in memory) + the set symbol; `fetchImage` crops art to the card aspect and rasterises the SVG symbol. |
| `core/catalog/index.ts` | `CATALOG_SOURCES` — the ordered source registry the add dialog renders one tab per. |
| `core/image.ts` | `toStorableBlob` / `fileToStorableBlob`: downscale to ≤512px edge, WebP q0.82, never crop. `svgToStorableBlob`: rasterise a set symbol onto a light coin. |
| `core/config.ts` | Reads `VITE_`-prefixed build-time env; `required()` throws loudly at boot on a missing var. |
| `core/dev-backend.ts` | `useMemoryBackend = import.meta.env.DEV && VITE_BACKEND === 'memory'`. |
| `app/App.vue` | The shell: watches the session to load the collection on sign-in and reset + redirect to `/login` on sign-out. Header, error banner, add-set dialog, toasts. |
| `app/router.ts` | Routes + guard that **awaits `authReady`** before deciding, so a hard refresh on an authed route doesn't bounce a signed-in user. |
| `app/views/*` | Route components: CollectionView, NeedsView, LoginView, AuthCallbackView. |
| `app/components/BaseOverlay.vue` | Shared responsive sheet/dialog chrome; delegates a11y to `useModalA11y`. Every modal builds on it. |

### How progress and needs are computed

`progressOf(set)` (`useCollection.ts`) counts in **copies**, capped per
collectible: `owned = Σ min(c.owned, c.target)`, `total = Σ c.target`. A set
never reads over 100%, and is `complete` only when `total > 0 && owned >= total`.

Needs (`useNeeds.ts`) are a **snapshot, not a live filter** — the important
subtlety. Per collectible `needed = max(target - owned, 0)`, but the list's
membership is captured into a `Map<id, needed>` by `captureNeeds()` (on entering
the view and on "Clear completed"). A row stays visible if it *needs > 0 or is
still in the snapshot*; completing a row marks it `complete` rather than removing
it, so rows don't vanish under a tapping finger and sorting doesn't reorder
mid-tap. The nav badge (`needingCount`) is deliberately snapshot-*independent* —
`Σ where owned < target` — so it's correct before the view is ever opened.

## Key workflows

Brief end-to-end traces; each names the files it touches.

- **Sign in → load.** `LoginView` → session set → `App.vue` watch fires
  `loadForUser()` → `repo.listSets()` (query + batch-sign URLs) → collection
  populated → redirect to `/`.
- **Add a collectible.** `AddCollectibleOverlay` renders one tab per source:
  *Upload* (file/drag/camera → `fileToStorableBlob`) plus a tab per
  `CATALOG_SOURCES` entry. Each catalogue tab is a `CatalogFlow` bound to that
  `CatalogSource`; it drives the source's two-step flow using `CatalogStep` (a
  reusable search-box + `CatalogResultGrid`) for each step. A search pick either
  commits straight to an image (Scryfall cards) or, if the source has `refine`,
  opens a **second searchable step** first: boosters refine into the set's card
  arts (`art_crop`, fetched once then filtered by card name in memory) plus the set
  symbol as a fallback. The final pick calls `source.fetchImage(result)`, which
  returns an already-storable WebP (card art → `cropToCardBlob` for boosters /
  `toStorableBlob` for full cards; set symbol → `svgToStorableBlob`), and the
  collectible keeps the *booster's* name. Either way
  → `useCollection.addCollectible` shows an instant object-URL preview, uploads to
  `<uid>/<uuid>.webp`, inserts the row, swaps preview for the signed URL (rolls
  back + revokes URL on failure).
- **Track copies.** `OwnedStepper` emits an absolute count →
  `setOwnedCount`/`setTarget` mutate in memory immediately, then a 400ms
  debounced write; a failed persist toasts and resyncs via `loadForUser()`.
- **Review needs.** Open `/needs` → `captureNeeds()` snapshots shortfalls →
  grouped/flat, sorted by name or amount needed → log copies inline; completed
  rows stay until "Clear completed" re-captures.
- **Delete + undo.** Remove a set/collectible → `ConfirmOverlay` → optimistic
  removal returns an async undo closure → `useToast` surfaces "Undo", which
  re-inserts the row(s) at the original index reusing original ids.

## Conventions & patterns

- **Components:** `<script setup lang="ts">`, Composition API, typed
  `defineProps<{…}>()` and `defineEmits<{ event: [args] }>()`. Props down, events
  up — views own state and orchestration; children are presentational and emit
  intent.
- **Async UI state:** model it as a discriminated union
  (`{ status: 'idle' | 'loading' | 'results' | 'empty' | 'error' }`), as
  `ScryfallSearch.vue` does.
- **Never import Supabase in UI code.** Components/composables talk to
  `useCollection`, which talks to `repo`. That is the only path to persistence.
- **Styling:** Tailwind utilities only — no CSS modules, no `<style>` blocks
  (global CSS lives solely in `core/style.css`). Use the **semantic colour
  tokens** from `tailwind.config.js` (`hall`, `violet`, `amber`, `ink`,
  `danger`); the config states **no hex literals anywhere in `src/`**. Fonts:
  `font-display` (Bebas Neue) and `font-body` (Inter); `aspect-card` for tiles.
  Dark theme is the only theme.
- **Responsive, no device detection.** Mobile-first: base classes target
  phones, `sm:`+ target desktop. The FAB is phone-only (`sm:hidden`) and
  contextual and hides while an overlay is open; `NavSwitcher` is the phone nav;
  touch targets shrink on desktop; safe-area insets (`env(safe-area-inset-*)`,
  `viewport-fit=cover`) throughout.
- **Modals** build on `BaseOverlay` and route keyboard/focus through
  `useModalA11y` — see `AddCollectibleOverlay` / `ConfirmOverlay` / `AddSetOverlay`.

## Gotchas & rationale

Each of these has a comment in the code explaining the *why*; don't "clean them
up" without reading it.

- **Scryfall CORS cache-buster** (`catalog/mtg-cards/ fetchCardImage`, and the
  same trick in `catalog/mtg-boosters/ fetchImage`). The image CDN sends
  `Access-Control-Allow-Origin: *` only when the cached entry was first created by
  a request carrying an `Origin`; a prior non-CORS hit can poison the cache with a
  header-less copy that blocks the browser fetch. The `?cors=<ts>` param dodges the
  poisoned entry. **Do not remove it.**
- **Booster catalogue is vendored + generated, not live.**
  `src/core/data/boosters.json` is built by `scripts/build-booster-catalog.mjs`
  (`npm run build:boosters`), which joins `taw/magic-sealed-data` (the product
  list) with Scryfall `/sets` (the symbol). It's near-static reference data;
  search runs offline and in-memory. Regenerate it when a new set releases — it
  won't update itself. Products whose set has no Scryfall symbol are dropped.
- **Set symbols become images via a dedicated rasteriser**
  (`image.ts svgToStorableBlob`). Scryfall's symbol SVGs render black — invisible
  on the dark tiles — so the glyph is drawn onto a light "coin" (its fill pulled
  from the `ink` token at runtime, so no hex leaks into `src/`). It can't reuse
  `toStorableBlob` because `createImageBitmap`'s SVG support is unreliable; an
  `<img>`→canvas load is the portable path.
- **Deletes never remove Storage objects** — only DB rows. Undo re-inserts rows
  pointing at the surviving object, reusing original ids, which keeps it cheap
  and reliable. Don't add cascade deletes to Storage.
- **`exact-active-class`, not `active-class`** on RouterLinks (`AppHeader`,
  `NavSwitcher`): `/` prefixes every route and would otherwise keep "Collection"
  lit on `/needs`.
- **PWA `registerType: 'prompt'`** (`vite.config.ts`) with a manual registration
  via `virtual:pwa-register/vue` in `UpdateBanner.vue` (`injectRegister: false` so
  it isn't registered twice; `src/globals.d.ts` references the plugin's client types
  to keep `vue-tsc` clean). A waiting update surfaces the banner instead of silently
  swapping the SW — no background reloads, no polling. `src/app/public/_headers`
  marks `sw.js` / `index.html` `no-cache` so an edge cache can't hide a new build.
  The service worker precaches the app *shell* only; live data (Supabase, Scryfall)
  is left to the network by design.
- **Security is RLS, not key secrecy.** `VITE_SUPABASE_PUBLISHABLE_KEY` is public
  by design. **Never** put the secret/service-role key in any `VITE_` var — it
  would be inlined into the client bundle.
- **Object URLs are paired.** `createObjectURL`/`revokeObjectURL` are balanced
  for blob previews (`AddCollectibleOverlay`, `useCollection.addCollectible`) to
  avoid leaks — keep them balanced.
- **Dev in-memory backend.** `VITE_BACKEND=memory` runs the whole UI with no
  Supabase project, network, or login (stub `dev-user` session). It is ANDed
  with `import.meta.env.DEV`, so it is dead code in any production build.
- **`PAGES_PROJECT` deploy footgun** (see `.env.example`). It is the Cloudflare
  *project name*, not the `.pages.dev` subdomain. A wrong value makes
  `wrangler pages deploy` silently create a **new** project — the deploy
  "succeeds" while the live site is untouched.
- **There is no test suite and no linter.** The only quality gate is
  `npm run typecheck` (`vue-tsc --noEmit`), which `npm run build` runs first.
  strict tsconfig with `noUnusedLocals`/`noUnusedParameters` means an unused
  import fails the build. "Run the tests" means run the typecheck. (Playwright is
  in `devDependencies` but unused — no config, no specs.)

## Build, run, deploy

`Taskfile.yml` is the intended entry point; it wraps the npm scripts and loads
`.env`.

| Command | Does |
| --- | --- |
| `task install` | `npm ci` |
| `task dev` | `npm run dev` (Vite dev server, `:5173`) |
| `task build` | `npm run build` = typecheck **then** `vite build` → `dist/` |
| `task preview` | build, then serve `dist/` locally |
| `task deploy` | build, then `wrangler pages deploy dist` |

For local work with no backend at all, add `VITE_BACKEND=memory` to `.env.local`
and run `task dev`. The full deploy story lives in
[`deployment.md`](./deployment.md).
