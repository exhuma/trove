// Drives the built bundle over a real file:// URL and asserts the user-facing
// behaviour end to end. Run after `npm run build`.
import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const url = pathToFileURL(resolve('dist/index.html')).href
const browser = await chromium.launch()

const failures = []
const check = (name, condition, detail = '') => {
  if (condition) console.log(`  ok   ${name}`)
  else {
    console.log(`  FAIL ${name} ${detail}`)
    failures.push(name)
  }
}

const context = await browser.newContext()
const page = await context.newPage()

const consoleErrors = []
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
page.on('pageerror', (e) => consoleErrors.push(String(e)))

const offsiteRequests = []
page.on('request', (r) => !r.url().startsWith('file://') && offsiteRequests.push(r.url()))

await page.goto(url)
await page.waitForSelector('h1')

console.log('\n— first run —')
const setCards = page.locator('main ul > li')
check('seeds three sets', (await setCards.count()) === 3)
check('shows the Marvel set from the photo', await page.getByText('Marvel Super Heroes').first().isVisible())
check('marks the finished set complete', (await page.getByText('Complete').count()) >= 1)
check('makes no network requests on load', offsiteRequests.length === 0, offsiteRequests.join(', '))

console.log('\n— progress is computed, not guessed —')
check('half-finished set reads 3 of 6', await page.getByText('3 of 6 owned').first().isVisible())
check('barely-started set reads 1 of 6', await page.getByText('1 of 6 owned').first().isVisible())

console.log('\n— an empty set is not a complete set —')
await page.getByRole('button', { name: 'New set' }).click()
await page.getByLabel('Set name').fill('Empty Box')
await page.getByRole('button', { name: 'Create set' }).click()
await page.waitForTimeout(200)
const emptyCard = page.locator('main ul > li').filter({ hasText: 'Empty Box' })
check('new empty set appears', await emptyCard.isVisible())
check('empty set is NOT marked complete', (await emptyCard.getByText('Complete').count()) === 0)
check('empty set says nothing added yet', await emptyCard.getByText('Nothing added yet').isVisible())

console.log('\n— adding a copy —')
await page.locator('main ul > li').filter({ hasText: 'Duskmourn' }).getByRole('button').first().click()
await page.waitForSelector('h2')
await page.getByRole('button', { name: 'Add a copy of Cult Healer' }).click()
await page.waitForTimeout(150)
check('adding a copy updates the set count', await page.getByText('2 of 6 owned').first().isVisible())
check(
  'the remove-a-copy control is now enabled',
  await page.getByRole('button', { name: 'Remove a copy of Cult Healer' }).isEnabled(),
)

console.log('\n— a higher target raises the bar —')
const cultTarget = page.getByRole('spinbutton', { name: 'Copies wanted of Cult Healer' })
await cultTarget.fill('2')
await page.keyboard.press('Tab')
await page.waitForTimeout(150)
check('raising a target grows the denominator', await page.getByText('2 of 7 owned').first().isVisible())
await cultTarget.fill('1')
await page.keyboard.press('Tab')
await page.waitForTimeout(150)
check('lowering the target restores it', await page.getByText('2 of 6 owned').first().isVisible())

console.log('\n— completing a set —')
for (const name of ['Dazzling Theater', 'Dollmaker', 'Emerge from the Cocoon', 'Enduring Innocence']) {
  await page.getByRole('button', { name: new RegExp(`Add a copy of ${name}`) }).click()
  await page.waitForTimeout(80)
}
check('set reports all owned', await page.getByText('All 6 owned').isVisible())
check('completion badge appears', await page.locator('h2 ~ * >> text=Complete').first().isVisible().catch(() => page.getByText('Complete').first().isVisible()))

console.log('\n— zoom lightbox —')
await page.getByRole('button', { name: /Zoom artwork for/ }).first().click()
await page.waitForTimeout(150)
check('zoom opens a lightbox', (await page.getByRole('dialog', { name: /Artwork:/ }).count()) === 1)
await page.keyboard.press('Escape')
await page.waitForTimeout(150)
check('Escape closes the lightbox', (await page.getByRole('dialog', { name: /Artwork:/ }).count()) === 0)

console.log('\n— persistence across a reload —')
await page.reload()
await page.waitForSelector('h1')
check('state survived the reload', await page.getByText('6 of 6 owned').first().isVisible())
check('user-created set survived', await page.getByText('Empty Box').isVisible())

console.log('\n— destructive actions confirm, then undo —')
const emptyBox = page.locator('main ul > li').filter({ hasText: 'Empty Box' })
await emptyBox.getByRole('button', { name: /Delete set/ }).click()
check('confirm dialog names the target', await page.getByText(/“Empty Box” will be deleted/).isVisible())
await page.getByRole('button', { name: 'Delete set', exact: true }).last().click()
await page.waitForTimeout(200)
// Scoped to the grid: the undo toast also contains the set's name.
check('set is gone from the grid after confirming', (await page.locator('main ul > li').filter({ hasText: 'Empty Box' }).count()) === 0)
check('an undo is offered', await page.getByRole('button', { name: 'Undo' }).isVisible())
await page.getByRole('button', { name: 'Undo' }).click()
await page.waitForTimeout(200)
check('undo restores the set', await page.getByText('Empty Box').isVisible())

console.log('\n— keyboard operability —')
await page.keyboard.press('Escape')
await page.locator('main ul > li').filter({ hasText: 'Bloomburrow' }).getByRole('button').first().click()
await page.waitForSelector('h2')
await page.getByRole('button', { name: 'Add collectible' }).click()
await page.waitForSelector('[role="dialog"]')
const focusedInDialog = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))
check('opening a dialog moves focus into it', focusedInDialog)
await page.keyboard.press('Escape')
await page.waitForTimeout(150)
check('Escape closes the dialog', (await page.locator('[role="dialog"]').count()) === 0)

// Checked before going offline: from here on the browser itself logs
// ERR_INTERNET_DISCONNECTED for the search fetch, which is the condition under
// test rather than a defect.
console.log('\n— console —')
check('no console errors during the whole run', consoleErrors.length === 0, consoleErrors.join(' | '))

console.log('\n— offline degradation —')
await context.setOffline(true)
await page.getByRole('button', { name: 'Add collectible' }).click()
await page.getByRole('tab', { name: 'Search Scryfall' }).click()
await page.getByLabel('Search Scryfall').fill('bolt')
await page.waitForTimeout(2500)
check(
  'offline search explains itself instead of hanging',
  await page.getByText(/Couldn't reach Scryfall/).isVisible(),
)
await context.setOffline(false)

// The app must swallow the network failure itself: an unhandled rejection here
// would mean the error reached the user as a broken page rather than a message.
check(
  'the offline failure surfaces as UI, not as an unhandled error',
  !consoleErrors.some((e) => /Unhandled|Uncaught/i.test(e)),
  consoleErrors.join(' | '),
)

await browser.close()

console.log(failures.length ? `\n${failures.length} FAILURE(S): ${failures.join(', ')}` : '\nAll checks passed.')
process.exit(failures.length ? 1 : 0)
