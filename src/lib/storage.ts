import type { CollectibleSet } from '../types'

const KEY = 'collectibles.v1'
const VERSION = 2

interface Payload {
  version: number
  sets: CollectibleSet[]
}

/**
 * Version 1 stored ownership as a single boolean. Version 2 tracks copy
 * counts, so an owned card becomes 1 of a wanted 1, a wanted card 0 of 1 —
 * preserving each card's completion state. The KEY is unchanged so existing
 * data is upgraded in place rather than orphaned.
 */
function migrateV1(sets: CollectibleSet[]): CollectibleSet[] {
  return sets.map((set) => ({
    ...set,
    collectibles: set.collectibles.map((c) => ({
      id: c.id,
      name: c.name,
      image: c.image,
      owned: (c as unknown as { owned?: boolean }).owned ? 1 : 0,
      target: 1,
    })),
  }))
}

export type SaveResult = { ok: true } | { ok: false; reason: 'quota' | 'unavailable' }

/**
 * Some browsers refuse localStorage on file:// origins, which is exactly how
 * this app is meant to be opened. Probing once up front lets the UI tell the
 * user their work will not persist, rather than failing on the first write.
 */
function probe(): boolean {
  try {
    const k = '__probe__'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

export const storageAvailable = probe()

export function load(): CollectibleSet[] | null {
  if (!storageAvailable) return null
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const payload = JSON.parse(raw) as Payload
    if (!Array.isArray(payload.sets)) return null
    // Migrate the one older shape we know; anything newer is from a future
    // build and is safer to ignore than to guess at.
    if (payload.version === 1) return migrateV1(payload.sets)
    if (payload.version !== VERSION) return null
    return payload.sets
  } catch {
    return null
  }
}

export function save(sets: CollectibleSet[]): SaveResult {
  if (!storageAvailable) return { ok: false, reason: 'unavailable' }
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: VERSION, sets } satisfies Payload))
    return { ok: true }
  } catch (err) {
    // QuotaExceededError is reported under different names across browsers, and
    // Firefox uses code 1014. Anything else that throws here is also a failure
    // to persist, so it is reported the same way.
    const isQuota =
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        err.code === 22 ||
        err.code === 1014)
    return { ok: false, reason: isQuota ? 'quota' : 'unavailable' }
  }
}
