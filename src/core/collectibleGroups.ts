import type { Collectible } from './types'

/** Several collectibles that are printings/variants of the same underlying card. */
export interface CollectibleGroup {
  key: string
  name: string
  image: string
  /** Summed across variants, each capped at its own target. */
  owned: number
  /** Summed across variants. */
  target: number
  complete: boolean
  variants: Collectible[]
}

/**
 * Groups collectibles by `variantKey` where present, falling back to a
 * case-insensitive trimmed name match for anything without one (collectibles
 * added before variant grouping existed, or from a source with no such
 * concept). Never groups across two different calls — callers scope this per
 * `CollectibleSet` so variants don't merge across sets.
 */
export function groupCollectibles(collectibles: Collectible[]): CollectibleGroup[] {
  const byKey = new Map<string, Collectible[]>()
  for (const c of collectibles) {
    const key = c.variantKey ?? `name:${c.name.trim().toLowerCase()}`
    const group = byKey.get(key)
    if (group) group.push(c)
    else byKey.set(key, [c])
  }

  return [...byKey.entries()].map(([key, variants]) => {
    const owned = variants.reduce((n, c) => n + Math.min(c.owned, c.target), 0)
    const target = variants.reduce((n, c) => n + c.target, 0)
    const primary = variants[0]
    return {
      key,
      name: primary.name,
      image: primary.image,
      owned,
      target,
      complete: target > 0 && owned >= target,
      variants,
    }
  })
}
