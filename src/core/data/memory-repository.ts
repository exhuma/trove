import type { Collectible, CollectibleSet } from '../types'
import type { CollectionRepository, NewCollectible } from './repository'

/**
 * In-memory implementation of the collection repository, for local development
 * loops only (selected by `src/core/dev-backend.ts`). Data lives for the page
 * session and is gone on a hard reload — there is no backing store.
 *
 * Images are kept as object URLs created straight from the uploaded blob, so a
 * picture renders with no Storage upload or signed-URL round-trip. That mirrors
 * the Supabase repo's contract: `Collectible.image` is always a ready-to-render
 * URL and the composable never sees Storage details.
 *
 * Returned objects are always clones, so the composable's optimistic in-place
 * edits can never mutate this store behind its own methods' backs.
 */
export class MemoryCollectionRepository implements CollectionRepository {
  private sets: CollectibleSet[] = []

  private clone(set: CollectibleSet): CollectibleSet {
    return { id: set.id, name: set.name, collectibles: set.collectibles.map((c) => ({ ...c })) }
  }

  private find(collectibleId: string): { set: CollectibleSet; index: number } | null {
    for (const set of this.sets) {
      const index = set.collectibles.findIndex((c) => c.id === collectibleId)
      if (index !== -1) return { set, index }
    }
    return null
  }

  async listSets(): Promise<CollectibleSet[]> {
    return this.sets.map((s) => this.clone(s))
  }

  async createSet(input: { name: string }): Promise<CollectibleSet> {
    const set: CollectibleSet = { id: crypto.randomUUID(), name: input.name, collectibles: [] }
    this.sets.push(set)
    return this.clone(set)
  }

  async deleteSet(id: string): Promise<void> {
    this.sets = this.sets.filter((s) => s.id !== id)
  }

  async restoreSet(set: CollectibleSet): Promise<void> {
    // Reuse the original ids, just like the Supabase repo, so undo round-trips.
    this.sets.push(this.clone(set))
  }

  async createCollectible(setId: string, input: NewCollectible): Promise<Collectible> {
    const set = this.sets.find((s) => s.id === setId)
    if (!set) throw new Error('That set no longer exists.')
    const collectible: Collectible = {
      id: crypto.randomUUID(),
      name: input.name,
      image: URL.createObjectURL(input.blob),
      imagePath: `memory/${crypto.randomUUID()}.webp`,
      owned: 0,
      target: Math.max(1, Math.floor(input.target ?? 1)),
      variantKey: input.variantKey ?? null,
      notes: '',
      addedAt: new Date().toISOString(),
    }
    set.collectibles.push(collectible)
    return { ...collectible }
  }

  async deleteCollectible(id: string): Promise<void> {
    const hit = this.find(id)
    if (hit) hit.set.collectibles.splice(hit.index, 1)
  }

  async restoreCollectible(setId: string, collectible: Collectible): Promise<void> {
    const set = this.sets.find((s) => s.id === setId)
    if (!set) throw new Error('That set no longer exists.')
    set.collectibles.push({ ...collectible })
  }

  async updateCollectible(
    id: string,
    patch: { owned?: number; target?: number; notes?: string },
  ): Promise<void> {
    const hit = this.find(id)
    if (!hit) return
    const collectible = hit.set.collectibles[hit.index]
    if (patch.owned !== undefined) collectible.owned = patch.owned
    if (patch.target !== undefined) collectible.target = patch.target
    if (patch.notes !== undefined) collectible.notes = patch.notes
  }
}
