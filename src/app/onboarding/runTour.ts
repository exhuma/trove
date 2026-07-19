import { driver, type DriveStep } from 'driver.js'
import type { TourTip } from './tips'

/**
 * The first element matching the selector that is actually rendered. Several
 * anchors are duplicated across a mobile and a desktop control where only one is
 * shown at a time (the other is `display:none`); `getClientRects()` is empty for a
 * hidden element, so this picks the visible copy and skips the hidden one.
 */
function firstVisible(selector: string): Element | null {
  for (const el of document.querySelectorAll(selector)) {
    if (el.getClientRects().length > 0) return el
  }
  return null
}

/**
 * Thin wrapper over driver.js, kept behind this seam so the library can be swapped.
 * Runs the given tips as a spotlight tour and resolves with the keys of the tips
 * actually shown — a tip whose anchor is absent or hidden is skipped and never
 * reported, so the caller only ever persists what the user really saw.
 *
 * The driver.css stylesheet is imported once in `main.ts`.
 */
export function runTour(tips: TourTip[]): Promise<string[]> {
  const present = tips
    .map((tip) => ({ tip, element: firstVisible(tip.selector) }))
    .filter((s): s is { tip: TourTip; element: Element } => s.element !== null)
  if (!present.length) return Promise.resolve([])

  const shown = new Set<string>()
  const steps: DriveStep[] = present.map(({ tip, element }) => ({
    element,
    popover: {
      title: tip.title,
      description: tip.body,
      // Fires when this step's popover renders — the moment the tip is truly shown.
      onPopoverRender: () => shown.add(tip.key),
    },
  }))

  return new Promise((resolve) => {
    const tour = driver({
      showProgress: present.length > 1,
      allowClose: true,
      // Belt-and-braces with the pre-filter above: never stall on a vanished anchor.
      skipMissingElement: true,
      steps,
      onDestroyed: () => resolve([...shown]),
    })
    tour.drive()
  })
}
