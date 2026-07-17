import { computed, ref } from 'vue'
import type { Collectible, CollectibleSet } from '../types'
import { load, save, storageAvailable } from '../lib/storage'
import { SEED_SETS } from '../seed-data'

// Module-scope singleton state, shared by every component that calls
// useCollection(). No store library needed at this size.
const sets = ref<CollectibleSet[]>(load() ?? structuredClone(SEED_SETS))

/** True when the browser refused localStorage, so nothing will survive reload. */
const persistenceBlocked = ref(!storageAvailable)

export type MutationResult = { ok: true } | { ok: false; message: string }

const QUOTA_MESSAGE =
  'There is no room left in browser storage. Try a smaller picture, or remove a few collectibles first.'

/**
 * Writes the current state through to storage. On failure the caller is
 * expected to roll its change back, so the UI never shows something that was
 * silently not saved.
 *
 * Storage being entirely unavailable is not treated as a mutation failure: the
 * app stays usable in memory and says so via the banner instead.
 */
function persist(): MutationResult {
  const result = save(sets.value)
  if (result.ok) return { ok: true }
  if (result.reason === 'quota') return { ok: false, message: QUOTA_MESSAGE }
  persistenceBlocked.value = true
  return { ok: true }
}

/**
 * Progress for one set, counted in copies rather than cards. A card counts for
 * its target no matter how many extra copies are owned, so a set never reads
 * over 100%. A set with no collectibles is empty, not complete.
 */
export function progressOf(set: CollectibleSet) {
  const total = set.collectibles.reduce((n, c) => n + c.target, 0)
  const owned = set.collectibles.reduce((n, c) => n + Math.min(c.owned, c.target), 0)
  return { owned, total, complete: total > 0 && owned >= total, ratio: total ? owned / total : 0 }
}

export function useCollection() {
  function addSet(name: string): MutationResult {
    const set: CollectibleSet = { id: crypto.randomUUID(), name: name.trim(), collectibles: [] }
    sets.value = [...sets.value, set]
    const result = persist()
    if (!result.ok) sets.value = sets.value.filter((s) => s.id !== set.id)
    return result
  }

  /** Removes a set, returning an undo that restores it in its original place. */
  function removeSet(id: string): (() => void) | null {
    const index = sets.value.findIndex((s) => s.id === id)
    if (index === -1) return null
    const [removed] = sets.value.splice(index, 1)
    sets.value = [...sets.value]
    persist()

    return () => {
      const restored = [...sets.value]
      restored.splice(index, 0, removed)
      sets.value = restored
      persist()
    }
  }

  function addCollectible(
    setId: string,
    input: Omit<Collectible, 'id' | 'owned' | 'target'> & { target?: number },
  ): MutationResult {
    const set = sets.value.find((s) => s.id === setId)
    if (!set) return { ok: false, message: 'That set no longer exists.' }

    const collectible: Collectible = {
      name: input.name,
      image: input.image,
      id: crypto.randomUUID(),
      owned: 0,
      target: Math.max(1, Math.floor(input.target ?? 1)),
    }
    set.collectibles.push(collectible)
    sets.value = [...sets.value]

    const result = persist()
    if (!result.ok) {
      // Roll back so the grid never shows a card that failed to save.
      set.collectibles = set.collectibles.filter((c) => c.id !== collectible.id)
      sets.value = [...sets.value]
    }
    return result
  }

  function removeCollectible(setId: string, collectibleId: string): (() => void) | null {
    const set = sets.value.find((s) => s.id === setId)
    if (!set) return null
    const index = set.collectibles.findIndex((c) => c.id === collectibleId)
    if (index === -1) return null

    const [removed] = set.collectibles.splice(index, 1)
    sets.value = [...sets.value]
    persist()

    return () => {
      const target = sets.value.find((s) => s.id === setId)
      if (!target) return
      target.collectibles.splice(index, 0, removed)
      sets.value = [...sets.value]
      persist()
    }
  }

  /** Sets how many copies are owned, clamped to a whole number >= 0. */
  function setOwnedCount(setId: string, collectibleId: string, count: number): MutationResult {
    return updateCollectible(setId, collectibleId, (c) => {
      c.owned = Math.max(0, Math.floor(count))
    })
  }

  /** Sets how many copies are wanted, clamped to a whole number >= 1. */
  function setTarget(setId: string, collectibleId: string, target: number): MutationResult {
    return updateCollectible(setId, collectibleId, (c) => {
      c.target = Math.max(1, Math.floor(target))
    })
  }

  /**
   * Applies a mutation to one collectible and persists it, rolling the change
   * back if the save fails so the grid never shows an unsaved count.
   */
  function updateCollectible(
    setId: string,
    collectibleId: string,
    mutate: (c: Collectible) => void,
  ): MutationResult {
    const collectible = sets.value
      .find((s) => s.id === setId)
      ?.collectibles.find((c) => c.id === collectibleId)
    if (!collectible) return { ok: false, message: 'That collectible no longer exists.' }

    const previous = { owned: collectible.owned, target: collectible.target }
    mutate(collectible)
    sets.value = [...sets.value]

    const result = persist()
    if (!result.ok) {
      collectible.owned = previous.owned
      collectible.target = previous.target
      sets.value = [...sets.value]
    }
    return result
  }

  return {
    sets,
    persistenceBlocked,
    totals: computed(() => {
      const all = sets.value.flatMap((s) => s.collectibles)
      return {
        sets: sets.value.length,
        owned: all.reduce((n, c) => n + Math.min(c.owned, c.target), 0),
        wanted: all.reduce((n, c) => n + Math.max(c.target - c.owned, 0), 0),
        completeSets: sets.value.filter((s) => progressOf(s).complete).length,
      }
    }),
    addSet,
    removeSet,
    addCollectible,
    removeCollectible,
    setOwnedCount,
    setTarget,
    getSet: (id: string) => sets.value.find((s) => s.id === id),
  }
}
