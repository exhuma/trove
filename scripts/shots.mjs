// Captures every user-relevant view and UI state from the built bundle,
// driving it over file:// exactly as the user will open it.
import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { mkdir, rm } from 'node:fs/promises'

const url = pathToFileURL(resolve('dist/index.html')).href
const OUT = 'screenshots'
await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })
const page = await context.newPage()

let n = 0
const shot = async (name, opts = {}) => {
  const file = `${OUT}/${String(++n).padStart(2, '0')}-${name}.png`
  await page.screenshot({ path: file, ...opts })
  console.log(file)
}

const settle = () => page.waitForTimeout(450)

// --- Empty state: what a first-time user sees with nothing collected ---------
await page.goto(url)
await page.evaluate(() => localStorage.setItem('collectibles.v1', JSON.stringify({ version: 1, sets: [] })))
await page.reload()
await page.waitForSelector('h1')
await settle()
await shot('empty-no-sets', { fullPage: true })

await page.getByRole('button', { name: 'New set' }).click()
await settle()
await shot('dialog-new-set')

await page.getByLabel('Set name').fill('Sticker Album')
await settle()
await shot('dialog-new-set-filled')
await page.keyboard.press('Escape')

// --- The seeded library: mixed progress across three sets -------------------
await page.evaluate(() => localStorage.removeItem('collectibles.v1'))
await page.reload()
await page.waitForSelector('h1')
await settle()
await shot('browse-sets-mixed-progress', { fullPage: true })

// --- A set mid-collection: owned and wanted side by side --------------------
await page.locator('main ul > li').filter({ hasText: 'Bloomburrow' }).getByRole('button').first().click()
await page.waitForSelector('h2')
await settle()
await shot('set-detail-partial', { fullPage: true })

await page.getByRole('button', { name: 'Add collectible' }).click()
await settle()
await shot('dialog-add-collectible-upload')

await page.getByRole('tab', { name: 'Search Scryfall' }).click()
await page.getByLabel('Search Scryfall').fill('brightblade stoat')
await page.waitForTimeout(2600)
await shot('dialog-scryfall-search-results')
await page.keyboard.press('Escape')

// --- A completed set --------------------------------------------------------
await page.getByRole('button', { name: 'All sets' }).click()
await settle()
await page.locator('main ul > li').filter({ hasText: 'Marvel' }).getByRole('button').first().click()
await page.waitForSelector('h2')
await settle()
await shot('set-detail-complete', { fullPage: true })

// --- Destructive action: confirm, then the undo it leaves behind ------------
await page.getByRole('button', { name: /Remove Agent 13/ }).click()
await settle()
await shot('dialog-confirm-remove-collectible')

await page.getByRole('button', { name: 'Remove', exact: true }).last().click()
await settle()
await shot('toast-undo-after-remove', { fullPage: true })

await page.getByRole('button', { name: 'Undo' }).click()
await page.getByRole('button', { name: 'All sets' }).click()
await settle()
await page.locator('main ul > li').filter({ hasText: 'Duskmourn' }).getByRole('button', { name: /Delete set/ }).click()
await settle()
await shot('dialog-confirm-delete-set')
await page.keyboard.press('Escape')

// --- Offline: the search degrades to an explanation -------------------------
await page.locator('main ul > li').filter({ hasText: 'Duskmourn' }).getByRole('button').first().click()
await page.waitForSelector('h2')
await context.setOffline(true)
await page.getByRole('button', { name: 'Add collectible' }).click()
await page.getByRole('tab', { name: 'Search Scryfall' }).click()
await page.getByLabel('Search Scryfall').fill('bolt')
await page.waitForTimeout(2600)
await shot('dialog-scryfall-offline-error')
await context.setOffline(false)
await page.keyboard.press('Escape')

// --- Narrow viewport --------------------------------------------------------
await page.setViewportSize({ width: 420, height: 880 })
await page.getByRole('button', { name: 'All sets' }).click()
await settle()
await shot('mobile-browse-sets', { fullPage: true })

await browser.close()
console.log(`\n${n} screenshots written to ${OUT}/`)
