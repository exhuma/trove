import type { Collectible, CollectibleSet } from '../types'

/** A collectible about to be created: an already-downscaled WebP blob plus metadata. */
export interface NewCollectible {
  name: string
  blob: Blob
  target?: number
  /** Shared identity across printings of "the same card", if the source has one. */
  variantKey?: string
}

/**
 * The single seam between the app and its persistence. The composable talks only to
 * this interface, so "localStorage vs Supabase" is one swappable implementation.
 *
 * All methods are async and per-row. Image resolution (Storage path -> signed display
 * URL) is the repository's job, so the composable and components never see Storage
 * details — `Collectible.image` is always a ready-to-render URL.
 *
 * Deletes remove DB rows only, never Storage objects; that keeps undo cheap and
 * reliable — `restoreSet`/`restoreCollectible` re-insert rows that still point at the
 * surviving object, reusing the original ids.
 */
export interface CollectionRepository {
  /** Every set owned by the current user, with collectibles and resolved image URLs. */
  listSets(): Promise<CollectibleSet[]>

  createSet(input: { name: string }): Promise<CollectibleSet>
  deleteSet(id: string): Promise<void>
  /** Undo of deleteSet: re-insert the set and its collectibles with their original ids. */
  restoreSet(set: CollectibleSet): Promise<void>

  createCollectible(setId: string, input: NewCollectible): Promise<Collectible>
  deleteCollectible(id: string): Promise<void>
  /** Undo of deleteCollectible: re-insert the row, reusing its existing imagePath. */
  restoreCollectible(setId: string, collectible: Collectible): Promise<void>

  updateCollectible(id: string, patch: { owned?: number; target?: number; notes?: string }): Promise<void>
}
