// Opens the freshly-unzipped index.html from a temp directory, the way the
// user will: unzip somewhere, double-click. Checks the artifact itself rather
// than trusting the dist/ it was built from.
import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'

const target = process.argv[2]
if (!target) throw new Error('usage: node scripts/check-zip.mjs <path-to-index.html>')

const url = pathToFileURL(target).href
const browser = await chromium.launch()
const page = await browser.newPage()

const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))

const offsite = []
page.on('request', (r) => !r.url().startsWith('file://') && offsite.push(r.url()))

await page.goto(url)
await page.waitForSelector('h1')

const sets = await page.locator('main ul > li').count()
const images = await page.locator('main img').count()
const fontsLoaded = await page.evaluate(() => document.fonts.check('16px "Bebas Neue"'))

// Toggling proves the app is not merely painted but wired up.
await page.locator('main ul > li').filter({ hasText: 'Duskmourn' }).getByRole('button').first().click()
await page.waitForSelector('h2')
await page.getByRole('button', { name: /Cult Healer.*wanted/ }).click()
await page.waitForTimeout(200)
const toggled = await page.getByText('2 of 6 owned').isVisible()

console.log(`opened      : ${url}`)
console.log(`sets shown  : ${sets}`)
console.log(`card images : ${images}`)
console.log(`display font: ${fontsLoaded ? 'loaded from the bundle' : 'MISSING'}`)
console.log(`interactive : ${toggled ? 'toggling ownership works' : 'FAILED'}`)
console.log(`network     : ${offsite.length ? offsite.join(', ') : 'no external requests'}`)
console.log(`errors      : ${errors.length ? errors.join(' | ') : 'none'}`)

await browser.close()

const ok = sets === 3 && images > 0 && fontsLoaded && toggled && !offsite.length && !errors.length
console.log(ok ? '\nArtifact verified: standalone and fully functional.' : '\nARTIFACT CHECK FAILED')
process.exit(ok ? 0 : 1)
