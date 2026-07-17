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
}

/** A named set of collectibles. */
export interface CollectibleSet {
  id: string
  name: string
  collectibles: Collectible[]
}
