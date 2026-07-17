// Build-time only. Fetches real cards from Scryfall and bakes them into
// src/seed-data.ts so the shipped app opens populated with zero network calls.
// Run with `npm run seed`; the generated file is committed.
//
// Scryfall's API guidelines are binding here:
//   - a descriptive User-Agent and an Accept header on every request
//   - /cards/search is limited to 2 req/s; other endpoints to 10 req/s
//   - a 429 means a 30s lockout, and ignoring it risks a permanent ban
// So every request goes through fetchJson()/fetchBinary(), which throttle.
import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'

const HEADERS = {
  'User-Agent': 'CollectiblesDemo/1.0 (offline demo app; contact: exhuma@gmail.com)',
  Accept: 'application/json',
}

// 600ms clears the strictest documented bucket (/cards/search at 2/s) with room
// to spare. This script runs once, so there is nothing to gain by racing it.
const THROTTLE_MS = 600
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let lastRequest = 0
async function throttled(url, headers = HEADERS) {
  const wait = THROTTLE_MS - (Date.now() - lastRequest)
  if (wait > 0) await sleep(wait)
  lastRequest = Date.now()
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  return res
}

const fetchJson = async (url) => (await throttled(url)).json()
const fetchBinary = async (url) =>
  Buffer.from(await (await throttled(url, { 'User-Agent': HEADERS['User-Agent'], Accept: '*/*' })).arrayBuffer())

/**
 * Card images are re-encoded smaller to fit the ~5MB localStorage budget, but
 * are never cropped or otherwise altered: Scryfall's image rules forbid
 * clipping the artist credit and copyright line that every card carries.
 * Scaling the whole card preserves them.
 */
async function toWebpDataUrl(buffer, width) {
  const out = await sharp(buffer).resize({ width }).webp({ quality: 82 }).toBuffer()
  return `data:image/webp;base64,${out.toString('base64')}`
}

// Three sets at deliberately different completion stages, so the browse grid
// demonstrates empty / partial / complete progress without any user input.
// Marvel Super Heroes is the set on the banner in the MagicCon Amsterdam hall.
const PLAN = [
  { code: 'msh', take: 6, owned: 6 }, // complete
  { code: 'blb', take: 6, owned: 3 }, // half done
  { code: 'dsk', take: 6, owned: 1 }, // barely started
]

async function buildSet({ code, take, owned }) {
  const set = await fetchJson(`https://api.scryfall.com/sets/${code}`)
  console.log(`${set.name}: fetching ${take} cards`)

  // One search per set rather than guessing collector numbers, which may not
  // exist. Ordered by set position so the picks are stable between runs.
  const search = await fetchJson(
    `https://api.scryfall.com/cards/search?q=${encodeURIComponent(
      `set:${code} -is:digital`,
    )}&order=set&unique=cards`,
  )

  const picked = search.data.filter((c) => c.image_uris?.normal).slice(0, take)
  if (picked.length < take) throw new Error(`${code}: only ${picked.length} usable cards`)

  const symbolSvg = await fetchBinary(set.icon_svg_uri)

  const collectibles = []
  for (const [i, card] of picked.entries()) {
    const image = await toWebpDataUrl(await fetchBinary(card.image_uris.normal), 300)
    collectibles.push({
      id: `seed-${code}-${card.collector_number}`,
      name: card.name,
      image,
      owned: i < owned ? 1 : 0,
      target: 1,
    })
    console.log(`  ${i < owned ? '[owned] ' : '[wanted]'} ${card.name}`)
  }

  return {
    id: `seed-${code}`,
    name: set.name,
    // Inlined rather than hotlinked: Scryfall explicitly asks that set icons be
    // downloaded and served locally, since they change slightly over time.
    symbol: `data:image/svg+xml;base64,${symbolSvg.toString('base64')}`,
    collectibles,
  }
}

const sets = []
for (const entry of PLAN) sets.push(await buildSet(entry))

const banner = `// GENERATED FILE — do not edit by hand.
// Produced by scripts/seed.mjs from the Scryfall API (https://scryfall.com).
// Regenerate with: npm run seed
//
// Card images and set symbols are copyright Wizards of the Coast, provided by
// Scryfall under the Wizards Fan Content Policy. They are reproduced whole and
// unaltered apart from scaling. See FanContentFooter.vue for the disclaimer.
`

await writeFile(
  'src/seed-data.ts',
  `${banner}\nimport type { CollectibleSet } from './types'\n\nexport const SEED_SETS: CollectibleSet[] = ${JSON.stringify(sets, null, 2)}\n`,
)

const bytes = sets.reduce((n, s) => n + s.collectibles.reduce((m, c) => m + c.image.length, 0), 0)
console.log(`\nWrote src/seed-data.ts — ${sets.length} sets, ${(bytes / 1024).toFixed(0)}KB of images`)
