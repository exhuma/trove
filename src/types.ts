/** A single collectible. `image` is always a self-contained data URL. */
export interface Collectible {
  id: string
  name: string
  image: string
  /** Copies in hand. Never negative. */
  owned: number
  /** Copies wanted (a playset is 4). At least 1. A card is complete once
   *  `owned >= target`. */
  target: number
}

/** A named set of collectibles. `symbol` is an optional data-URL set icon. */
export interface CollectibleSet {
  id: string
  name: string
  symbol?: string
  collectibles: Collectible[]
}
