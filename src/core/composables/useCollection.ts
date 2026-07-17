import { computed, ref } from 'vue'
import type { Collectible, CollectibleSet } from '../types'
import { repo } from '../data'
import { useToast } from './useToast'

// Module-scope singleton state, shared by every component that calls
// useCollection(). No store library needed at this size.
const sets = ref<CollectibleSet[]>([])

/** True while the initial load for the signed-in user is in flight. */
const loading = ref(false)
/** Last load/persist error, surfaced by the app as a banner. */
const error = ref<string | null>(null)
/** True once a load has completed at least once for the current session. */
const ready = ref(false)

const { push } = useToast()

export type MutationResult = { ok: true } | { ok: false; message: string }

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.'
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

// Persisting owned/target counts is debounced per collectible so a rapid run of
// stepper clicks collapses into one write of the latest value.
const UPDATE_DEBOUNCE_MS = 400
const pendingWrites = new Map<string, ReturnType<typeof setTimeout>>()

function scheduleWrite(collectibleId: string) {
  clearTimeout(pendingWrites.get(collectibleId))
  pendingWrites.set(
    collectibleId,
    setTimeout(async () => {
      pendingWrites.delete(collectibleId)
      const current = sets.value.flatMap((s) => s.collectibles).find((c) => c.id === collectibleId)
      if (!current) return
      try {
        await repo.updateCollectible(collectibleId, { owned: current.owned, target: current.target })
      } catch (err) {
        // The in-memory value may now disagree with the server; resync so the grid
        // reflects what was actually saved, and tell the user.
        push(messageOf(err), { tone: 'error' })
        await loadForUser()
      }
    }, UPDATE_DEBOUNCE_MS),
  )
}

/** Loads the signed-in user's collection. Called on sign-in. */
export async function loadForUser(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    sets.value = await repo.listSets()
    ready.value = true
  } catch (err) {
    error.value = messageOf(err)
  } finally {
    loading.value = false
  }
}

/** Clears all state. Called on sign-out. */
export function reset(): void {
  for (const timer of pendingWrites.values()) clearTimeout(timer)
  pendingWrites.clear()
  sets.value = []
  ready.value = false
  error.value = null
}

export function useCollection() {
  async function addSet(name: string): Promise<MutationResult> {
    const temp: CollectibleSet = { id: crypto.randomUUID(), name: name.trim(), collectibles: [] }
    sets.value = [...sets.value, temp]
    try {
      const saved = await repo.createSet({ name: temp.name })
      sets.value = sets.value.map((s) => (s.id === temp.id ? saved : s))
      return { ok: true }
    } catch (err) {
      sets.value = sets.value.filter((s) => s.id !== temp.id)
      return { ok: false, message: messageOf(err) }
    }
  }

  /** Removes a set, returning an async undo that restores it in its original place. */
  async function removeSet(id: string): Promise<(() => Promise<void>) | null> {
    const index = sets.value.findIndex((s) => s.id === id)
    if (index === -1) return null
    const removed = sets.value[index]
    sets.value = sets.value.filter((s) => s.id !== id)

    try {
      await repo.deleteSet(id)
    } catch (err) {
      const restored = [...sets.value]
      restored.splice(index, 0, removed)
      sets.value = restored
      push(messageOf(err), { tone: 'error' })
      return null
    }

    return async () => {
      const restored = [...sets.value]
      restored.splice(index, 0, removed)
      sets.value = restored
      try {
        await repo.restoreSet(removed)
      } catch (err) {
        sets.value = sets.value.filter((s) => s.id !== removed.id)
        push(messageOf(err), { tone: 'error' })
      }
    }
  }

  async function addCollectible(
    setId: string,
    input: { name: string; blob: Blob; target?: number },
  ): Promise<MutationResult> {
    const set = sets.value.find((s) => s.id === setId)
    if (!set) return { ok: false, message: 'That set no longer exists.' }

    // Show the picture immediately via an object URL, swapped for the signed URL
    // once the upload+insert returns.
    const previewUrl = URL.createObjectURL(input.blob)
    const temp: Collectible = {
      id: crypto.randomUUID(),
      name: input.name,
      image: previewUrl,
      imagePath: '',
      owned: 0,
      target: Math.max(1, Math.floor(input.target ?? 1)),
    }
    set.collectibles.push(temp)
    sets.value = [...sets.value]

    try {
      const saved = await repo.createCollectible(setId, { name: input.name, blob: input.blob, target: temp.target })
      const target = sets.value.find((s) => s.id === setId)
      if (target) {
        const i = target.collectibles.findIndex((c) => c.id === temp.id)
        if (i !== -1) target.collectibles[i] = saved
        sets.value = [...sets.value]
      }
      URL.revokeObjectURL(previewUrl)
      return { ok: true }
    } catch (err) {
      const target = sets.value.find((s) => s.id === setId)
      if (target) target.collectibles = target.collectibles.filter((c) => c.id !== temp.id)
      sets.value = [...sets.value]
      URL.revokeObjectURL(previewUrl)
      return { ok: false, message: messageOf(err) }
    }
  }

  async function removeCollectible(
    setId: string,
    collectibleId: string,
  ): Promise<(() => Promise<void>) | null> {
    const set = sets.value.find((s) => s.id === setId)
    if (!set) return null
    const index = set.collectibles.findIndex((c) => c.id === collectibleId)
    if (index === -1) return null
    const removed = set.collectibles[index]
    set.collectibles.splice(index, 1)
    sets.value = [...sets.value]

    try {
      await repo.deleteCollectible(collectibleId)
    } catch (err) {
      const s = sets.value.find((x) => x.id === setId)
      if (s) {
        s.collectibles.splice(index, 0, removed)
        sets.value = [...sets.value]
      }
      push(messageOf(err), { tone: 'error' })
      return null
    }

    return async () => {
      const s = sets.value.find((x) => x.id === setId)
      if (!s) return
      s.collectibles.splice(index, 0, removed)
      sets.value = [...sets.value]
      try {
        await repo.restoreCollectible(setId, removed)
      } catch (err) {
        const s2 = sets.value.find((x) => x.id === setId)
        if (s2) {
          s2.collectibles = s2.collectibles.filter((c) => c.id !== removed.id)
          sets.value = [...sets.value]
        }
        push(messageOf(err), { tone: 'error' })
      }
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
   * Applies a mutation to one collectible in memory (so the grid updates at once)
   * and schedules a debounced write. Persist failures resync from the server and
   * toast, rather than yanking the number back under the user mid-edit.
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

    mutate(collectible)
    sets.value = [...sets.value]
    scheduleWrite(collectibleId)
    return { ok: true }
  }

  return {
    sets,
    loading,
    error,
    ready,
    loadForUser,
    reset,
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
