/**
 * A pluggable source of collectibles to add — a searchable external catalogue.
 *
 * Trove started with a single hardwired source (Scryfall, for MTG cards). This
 * interface is the seam that lets a second source (MTG boosters) slot in beside
 * it: the picker UI and the add-collectible overlay talk only to a `CatalogSource`,
 * never to Scryfall directly. Everything downstream of a pick — the `Blob` handed
 * to `addCollectible`, Storage, the repository — is source-agnostic already.
 */

/** One pickable result: what the picker previews and, on pick, stores. */
export interface CatalogResult {
  id: string
  /** Canonical name — used to name the collectible on commit, and the tooltip. */
  name: string
  /** Secondary line that disambiguates same-named results (e.g. the set name). */
  subtitle: string
  /** Image to preview and, once picked, fetch into the user's Storage. */
  imageUrl: string
  /**
   * Optional display override for the primary line. A source uses this to show a
   * shorter, disambiguated label (e.g. a booster's product type without its
   * redundant set-name prefix) while `name` stays the full name. Defaults to `name`.
   */
  label?: string
  /**
   * How the picker frames `imageUrl` in its tile. Card scans and set symbols
   * letterbox precisely (`contain`); a cropped art fills the tile (`cover`).
   * Defaults to `contain`.
   */
  fit?: 'contain' | 'cover'
}

/** The outcome of a search: some results, nothing matched, or an error to show. */
export type CatalogSearchOutcome =
  | { status: 'results'; results: CatalogResult[] }
  | { status: 'empty' }
  | { status: 'error'; message: string }

/**
 * The optional second step: a *searchable* filter over a picked first-step result.
 *
 * Refining is a special case of searching — step 2 takes the same user query plus
 * the step-1 selection as extra input. Boosters use it to offer the picked set's
 * card arts (a booster's artwork is always a variant of a card from its set),
 * filterable by card name, with the set symbol as a quick fallback. It carries its
 * own search-box copy so the picker can render an identical search UX for it.
 */
export interface CatalogRefineStep {
  /** Label above the refine search box. */
  searchLabel: string
  /** Refine search-box placeholder. */
  placeholder: string
  /** Helper text under the refine search box. */
  hint: string
  /** Message shown when the filter matched nothing. */
  emptyLabel: string
  /** Debounce before the filter runs. A local filter can be snappy. */
  debounceMs: number
  /**
   * Minimum query length before `run` fires. `0` auto-runs on entry — the step
   * shows everything (the set's arts) immediately and narrows as the user types.
   */
  minQueryLength: number
  /**
   * Produce the refined results for `query`, given the first-step `picked` result.
   * A source that hits the network should fetch once and filter in memory on
   * later queries, so typing never re-hits a rate-limited API.
   */
  run(picked: CatalogResult, query: string, signal: AbortSignal): Promise<CatalogSearchOutcome>
}

export interface CatalogSource {
  /** Stable id, also used as the tab key. */
  key: string
  /** Tab label, e.g. "Cards" / "Boosters". */
  label: string
  /** Label above the search box. */
  searchLabel: string
  /** Search-box placeholder. */
  placeholder: string
  /** Helper text under the search box. */
  hint: string
  /** Copy shown between a pick and its image landing. */
  fetchingLabel: string
  /** Message shown when a search matched nothing. */
  emptyLabel: string
  /**
   * Debounce before a search fires. Scryfall needs 500ms to respect its 2 req/s
   * rate limit; a local source can be snappier.
   */
  debounceMs: number
  search(query: string, signal: AbortSignal): Promise<CatalogSearchOutcome>
  /**
   * Optional second step: a searchable filter that turns a picked result into a
   * further choice of images (see `CatalogRefineStep`). Sources without it
   * (Scryfall cards) send the first pick straight to `fetchImage`.
   */
  refine?: CatalogRefineStep
  /**
   * Fetches a picked result's image and returns a **storable** Blob — already
   * downscaled and WebP-encoded, ready to hand straight to `addCollectible`. The
   * source owns the encoding so it can pick the right path (a card photo vs a
   * vector set symbol).
   */
  fetchImage(result: CatalogResult, signal: AbortSignal): Promise<Blob>
}
