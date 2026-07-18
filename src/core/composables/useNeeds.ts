import { computed, ref, watch } from 'vue'
import { useCollection } from './useCollection'

// Module-scope singleton state, in the same style as useCollection: the needs
// view's sort/group choice and its snapshot are shared by every component that
// calls useNeeds(), so a control and a list never disagree about either.

const { sets } = useCollection()

export type NeedSort = 'name' | 'needed'

/** One collectible you are short of, flattened out of its set. */
export interface NeedRow {
  /** The owning set. Carried because setOwnedCount() is keyed by (setId, id). */
  setId: string
  setName: string
  id: string
  name: string
  image: string
  owned: number
  target: number
  /** Copies still missing right now: max(target - owned, 0). */
  needed: number
  /** True once you hold enough copies. Such rows stay listed until the next capture. */
  complete: boolean
  /** Copies missing when the list was captured. Used for ordering only. */
  snapshotNeeded: number
}

/** A rendered block of rows. In flat mode there is one, with an empty setId. */
export interface NeedGroup {
  setId: string
  setName: string
  rows: NeedRow[]
  /** Rows in this group that are still short of their target. */
  outstanding: number
}

/**
 * What was missing when the list was last captured, keyed by collectible id.
 *
 * The needs list is a snapshot rather than a live filter. Filtering live would
 * make a row vanish the moment its last copy is logged — pulling the rest of the
 * list up under a finger that is still tapping. Membership therefore stays fixed
 * between captures, and completed rows are shown as complete instead of removed.
 *
 * Always replaced wholesale, never mutated in place.
 */
const snapshot = ref<ReadonlyMap<string, number>>(new Map())

const grouped = ref(true)
const sort = ref<NeedSort>('name')

/** Re-reads what is missing. Called on entering the view and on explicit refresh. */
export function captureNeeds(): void {
  const next = new Map<string, number>()
  for (const set of sets.value) {
    for (const c of set.collectibles) {
      const needed = Math.max(c.target - c.owned, 0)
      if (needed > 0) next.set(c.id, needed)
    }
  }
  snapshot.value = next
}

/** Drops the snapshot. Called on sign-out, alongside the collection's reset(). */
export function clearNeedsSnapshot(): void {
  snapshot.value = new Map()
}

// Sort and grouping are view preferences rather than user content, so they live
// in localStorage and are re-read on the next visit. Both read and write are
// best-effort: storage can be unavailable (private mode, disabled cookies), and
// a preference is never worth an exception.
const PREFS_KEY = 'trove:needs-view'

function loadPrefs(): void {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return
    // Validated rather than trusted: a hand-edited or half-written value would
    // otherwise reach the comparator as undefined and silently drop the sort.
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return
    const prefs = parsed as { grouped?: unknown; sort?: unknown }
    if (typeof prefs.grouped === 'boolean') grouped.value = prefs.grouped
    if (prefs.sort === 'name' || prefs.sort === 'needed') sort.value = prefs.sort
  } catch {
    // Corrupt or unreadable — keep the defaults.
  }
}

loadPrefs()

watch([grouped, sort], () => {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ grouped: grouped.value, sort: sort.value }))
  } catch {
    // Preferences just won't persist this session.
  }
})

function compare(a: NeedRow, b: NeedRow): number {
  // Ordering keys off the snapshot, not the live shortfall, for the same reason
  // membership does: completing a row must not fling it down the list mid-tap.
  if (sort.value === 'needed') {
    return b.snapshotNeeded - a.snapshotNeeded || a.name.localeCompare(b.name)
  }
  return a.name.localeCompare(b.name)
}

/**
 * The rows to render, already sorted and bucketed. Derived from the live sets so
 * a deleted collectible simply drops out; the snapshot only decides which ids are
 * listed and in what order.
 */
const needGroups = computed<NeedGroup[]>(() => {
  const rows: NeedRow[] = []
  for (const set of sets.value) {
    for (const c of set.collectibles) {
      const needed = Math.max(c.target - c.owned, 0)
      if (needed === 0 && !snapshot.value.has(c.id)) continue
      rows.push({
        setId: set.id,
        setName: set.name,
        id: c.id,
        name: c.name,
        image: c.image,
        owned: c.owned,
        target: c.target,
        needed,
        complete: needed === 0,
        snapshotNeeded: snapshot.value.get(c.id) ?? needed,
      })
    }
  }

  if (!rows.length) return []

  if (!grouped.value) {
    return [
      {
        setId: '',
        setName: '',
        rows: rows.sort(compare),
        outstanding: rows.filter((r) => !r.complete).length,
      },
    ]
  }

  const groups = new Map<string, NeedGroup>()
  for (const row of rows) {
    let group = groups.get(row.setId)
    if (!group) {
      group = { setId: row.setId, setName: row.setName, rows: [], outstanding: 0 }
      groups.set(row.setId, group)
    }
    group.rows.push(row)
    if (!row.complete) group.outstanding += 1
  }

  return [...groups.values()]
    .sort((a, b) => a.setName.localeCompare(b.setName))
    .map((group) => ({ ...group, rows: group.rows.sort(compare) }))
})

/**
 * How many collectibles are short right now, across every set. Deliberately
 * independent of the snapshot: the nav badge has to be right before the view has
 * ever been opened, and must not keep counting a row the user just completed.
 */
const needingCount = computed(() =>
  sets.value.reduce(
    (n, set) => n + set.collectibles.filter((c) => c.owned < c.target).length,
    0,
  ),
)

const needTotals = computed(() => {
  const rows = needGroups.value.flatMap((g) => g.rows)
  return {
    /** Distinct collectibles still short of their target. */
    items: rows.filter((r) => !r.complete).length,
    /** Individual copies still to find. */
    copies: rows.reduce((n, r) => n + r.needed, 0),
    /** Rows on screen, completed ones included. */
    shown: rows.length,
  }
})

export function useNeeds() {
  return { needGroups, needTotals, needingCount, grouped, sort, captureNeeds, clearNeedsSnapshot }
}
