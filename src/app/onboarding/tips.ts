// Declarative guided-tour registry. Tips are data, not imperative calls scattered
// across components: each names a view, a `[data-tour]` anchor, and copy. The
// runner (runTour.ts) skips any tip whose anchor is absent, and the onboarding
// composable persists only the keys actually shown.
//
// A tip `key` is a persisted contract: once shipped it lives in users' seen-tip
// sets, so never rename or reuse one — that would silently re-show or strand a tip.

/** The views that can trigger a tour; must match the `startTour` argument. */
export type ViewKey = 'collection' | 'needs'

export interface TourTip {
  /** Stable; persisted in seen_tips. Never renamed or reused. */
  key: string
  view: ViewKey
  /** CSS selector for a `[data-tour="…"]` anchor element. */
  selector: string
  title: string
  body: string
  /** Lower runs first within a view. */
  priority: number
  /** Shown on the first visit; non-essentials trickle in on later visits. */
  essential: boolean
}

/** At most this many tips per view-visit, so a view never dumps them all at once. */
export const MAX_TIPS_PER_VISIT = 3

export const TOUR_TIPS: readonly TourTip[] = [
  {
    key: 'collection-add-set',
    view: 'collection',
    selector: '[data-tour="add-set"]',
    title: 'Start with a set',
    body: 'Every collectible lives in a set — a Magic expansion, a sealed-product run, whatever you collect. Create one here.',
    priority: 1,
    essential: true,
  },
  {
    key: 'collection-open-set',
    view: 'collection',
    selector: '[data-tour="set-card"]',
    title: 'Open a set to fill it',
    body: 'Tap a set to add cards from Scryfall or boosters from the catalogue, and to set how many copies you own versus your target.',
    priority: 2,
    essential: true,
  },
  {
    key: 'collection-needs-nav',
    view: 'collection',
    selector: '[data-tour="needs-nav"]',
    title: 'See what you still need',
    body: 'The Needs tab lists every collectible short of its target — a Magic playset is 4 — so you always know what to chase.',
    priority: 3,
    essential: false,
  },
  {
    key: 'needs-controls',
    view: 'needs',
    selector: '[data-tour="needs-controls"]',
    title: 'Sort and group your needs',
    body: 'Group outstanding copies by set or flatten them into one list, and sort to bring the biggest gaps to the top.',
    priority: 1,
    essential: true,
  },
]

/**
 * Tips to show for a view: unseen only, essentials first then by ascending
 * priority, capped per visit. The rest trickle in on later visits.
 */
export function selectTips(view: ViewKey, seenTips: readonly string[]): TourTip[] {
  const seen = new Set(seenTips)
  return TOUR_TIPS.filter((t) => t.view === view && !seen.has(t.key))
    .sort((a, b) => (a.essential !== b.essential ? (a.essential ? -1 : 1) : a.priority - b.priority))
    .slice(0, MAX_TIPS_PER_VISIT)
}
