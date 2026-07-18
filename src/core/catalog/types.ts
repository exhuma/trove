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
  name: string
  /** Secondary line that disambiguates same-named results (e.g. the set name). */
  subtitle: string
  /** Image to preview and, once picked, fetch into the user's Storage. */
  imageUrl: string
}

/** The outcome of a search: some results, nothing matched, or an error to show. */
export type CatalogSearchOutcome =
  | { status: 'results'; results: CatalogResult[] }
  | { status: 'empty' }
  | { status: 'error'; message: string }

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
   * Optional second step: turn a picked result into a further choice of images.
   * Boosters use this to offer the set's card arts (a booster's artwork is always
   * a variant of a card from its set), ordered by collector number, with the set
   * symbol as a quick fallback — rather than committing the symbol immediately.
   * Sources without it (Scryfall cards) send the first pick straight to `fetchImage`.
   */
  refine?(result: CatalogResult, signal: AbortSignal): Promise<CatalogSearchOutcome>
  /**
   * Fetches a picked result's image and returns a **storable** Blob — already
   * downscaled and WebP-encoded, ready to hand straight to `addCollectible`. The
   * source owns the encoding so it can pick the right path (a card photo vs a
   * vector set symbol).
   */
  fetchImage(result: CatalogResult, signal: AbortSignal): Promise<Blob>
}
