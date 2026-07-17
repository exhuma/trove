// Proves the load-bearing assumption: the bundle boots from a real file:// URL
// with no console errors, and localStorage is reachable from that origin.
import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const url = pathToFileURL(resolve('dist/index.html')).href
const browser = await chromium.launch()
const page = await browser.newPage()

const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))

const requests = []
page.on('request', (r) => requests.push(r.url()))

await page.goto(url)
await page.waitForSelector('[data-testid="storage"]')

console.log('url        :', url)
console.log('heading    :', await page.textContent('h1'))
console.log('storage    :', await page.textContent('[data-testid="storage"]'))
console.log('non-file requests:', requests.filter((r) => !r.startsWith('file://')))
console.log('console errors   :', errors.length ? errors : 'none')

await browser.close()
