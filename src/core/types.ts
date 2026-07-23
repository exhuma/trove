/** A single collectible. */
export interface Collectible {
  id: string
  name: string
  /** Resolved display URL (a signed Storage URL). What templates bind to `:src`. */
  image: string
  /** Storage object key — the persisted source of truth behind `image`. */
  imagePath: string
  /** Copies in hand. Never negative. */
  owned: number
  /** Copies wanted (a playset is 4). At least 1. A card is complete once
   *  `owned >= target`. */
  target: number
  /** Shared identity across printings of "the same card" — null for anything
   *  added before this existed, or from a source with no such concept (e.g. a
   *  booster). Collectibles with no key fall back to name-based grouping. */
  variantKey: string | null
  /** Free-text note. */
  notes: string
  /** ISO timestamp of when this collectible was added. */
  addedAt: string
}

/** A named set of collectibles. */
export interface CollectibleSet {
  id: string
  name: string
  collectibles: Collectible[]
}
