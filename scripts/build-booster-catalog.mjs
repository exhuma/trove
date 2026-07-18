#!/usr/bin/env node
// Regenerate `src/core/data/boosters.json` — the vendored MTG sealed-product
// catalogue the "Boosters" tab searches offline.
//
// Why vendored: there is no public API that serves sealed-product metadata *and*
// artwork over a browser-friendly endpoint. So we join two public sources at
// build time into a slim, near-static file and ship it in the bundle:
//
//   • taw/magic-sealed-data → the sealed-product list (name, set code, set name).
//   • Scryfall /sets        → the set symbol SVG, used as each product's picture.
//
// Products whose set has no Scryfall symbol are dropped (nothing to show).
//
// Run by hand — `npm run build:boosters` — and commit the result. Refresh when a
// new set releases; it is otherwise static. See docs/architecture.md.

import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const SEALED_URL =
  'https://raw.githubusercontent.com/taw/magic-sealed-data/master/sealed_extended_data.json'
const SETS_URL = 'https://api.scryfall.com/sets'
const OUT = fileURLToPath(new URL('../src/core/data/boosters.json', import.meta.url))

async function getJson(url) {
  // Scryfall's API rejects requests without a User-Agent (HTTP 400).
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Trove-booster-catalog/1.0' },
  })
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)
  return res.json()
}

console.log('Fetching sealed products…')
const products = await getJson(SEALED_URL)
console.log('Fetching Scryfall sets…')
const sets = (await getJson(SETS_URL)).data

// set code → set-symbol SVG. Codes are compared lowercase; taw and Scryfall agree
// on the codes for all but a handful of oddball products.
const iconBySet = new Map()
for (const set of sets) {
  if (set.icon_svg_uri) iconBySet.set(set.code.toLowerCase(), set.icon_svg_uri)
}

const seen = new Set()
const catalogue = []
let skipped = 0
for (const product of products) {
  const setCode = String(product.set_code || '').toLowerCase()
  const iconUrl = iconBySet.get(setCode)
  const id = product.code || `${setCode}-${product.name}`
  if (!iconUrl) {
    skipped++
    continue
  }
  if (seen.has(id)) continue
  seen.add(id)
  catalogue.push({ id, name: product.name, setCode, setName: product.set_name, iconUrl })
}

catalogue.sort(
  (a, b) => a.setName.localeCompare(b.setName) || a.name.localeCompare(b.name),
)

await writeFile(OUT, JSON.stringify(catalogue) + '\n')
console.log(
  `Wrote ${catalogue.length} products (${skipped} without a set symbol skipped) → ${OUT}`,
)
