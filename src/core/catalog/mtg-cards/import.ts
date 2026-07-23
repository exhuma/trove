import type { CatalogImporter, CatalogImportItem, CatalogImportOutcome, CatalogResult } from '../types'
import { imageOf, type ScryfallCard } from './scryfall'

/**
 * Bulk import of MTG cards from an Archidekt export. Two shapes of the same
 * columns are accepted, auto-detected per line:
 *
 *   text:  `12x Mountain (ecl) [Land]`
 *          `1x Nelly Borca, Impulsive Accuser (mkc) 4 *F* [Draw]`
 *   csv:   `12,Mountain,ecl,Normal,272`
 *          `1,"Nelly Borca, Impulsive Accuser",mkc,Foil,4`
 *
 * Columns: quantity, name, set code, optional foil marker, collector number.
 * The trailing `[Category]` in the text form is an Archidekt grouping artifact
 * and is ignored. Quantity becomes the collectible's `target`; a foil line gets
 * " (Foil)" appended to its name so it stays distinct from the non-foil copy.
 */

const EXAMPLE = `12x Mountain (ecl) [Land]
1x Nelly Borca, Impulsive Accuser (mkc) 4 *F* [Draw]
1x Night's Whisper (ecc) 81 [Draw]

— or CSV (qty, name, set, finish, collector) —

12,Mountain,ecl,Normal,272
1,"Nelly Borca, Impulsive Accuser",mkc,Foil,4
1,Night's Whisper,ecc,Normal,81`

/** One parsed line, before it's resolved against Scryfall. */
interface ParsedRow {
  line: string // the original text, for reporting an unresolved line
  quantity: number
  name: string
  setCode: string
  collector?: string
  foil: boolean
}

/** Scryfall accepts at most 75 identifiers per /cards/collection request. */
const COLLECTION_CHUNK = 75

/** A card-collectible carrying the parsed quantity, ready for the UI to add. */
export const mtgCardsImporter: CatalogImporter = {
  example: EXAMPLE,
  run,
}

async function run(
  text: string,
  signal: AbortSignal,
  onProgress?: (done: number, total: number) => void,
): Promise<CatalogImportOutcome> {
  const unresolved: { line: string; reason: string }[] = []
  const rows: ParsedRow[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const row = parseLine(line)
    if (row) rows.push(row)
    else unresolved.push({ line, reason: "Couldn't read this line." })
  }

  const items: CatalogImportItem[] = []
  let done = 0
  for (let i = 0; i < rows.length; i += COLLECTION_CHUNK) {
    const chunk = rows.slice(i, i + COLLECTION_CHUNK)
    await resolveChunk(chunk, signal, items, unresolved)
    done += chunk.length
    onProgress?.(done, rows.length)
  }

  return { items, unresolved }
}

/**
 * Resolves up to 75 rows in one /cards/collection call, appending the matches to
 * `items` and any misses to `unresolved`. Scryfall returns cards in an arbitrary
 * order and collapses duplicate identifiers, so matches are keyed back to their
 * rows rather than zipped positionally.
 */
async function resolveChunk(
  rows: ParsedRow[],
  signal: AbortSignal,
  items: CatalogImportItem[],
  unresolved: { line: string; reason: string }[],
): Promise<void> {
  const identifiers = rows.map(identifierFor)

  let body: { data?: ScryfallCard[] }
  try {
    const res = await fetch('https://api.scryfall.com/cards/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ identifiers }),
      signal,
    })
    if (res.status === 429) {
      for (const row of rows) unresolved.push({ line: row.line, reason: 'Too many requests — try again shortly.' })
      return
    }
    if (!res.ok) {
      for (const row of rows) unresolved.push({ line: row.line, reason: `Scryfall error (${res.status}).` })
      return
    }
    body = (await res.json()) as { data?: ScryfallCard[] }
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    for (const row of rows) unresolved.push({ line: row.line, reason: "Couldn't reach Scryfall." })
    return
  }

  // Index the returned cards by both keys a row might match on, so we can attach
  // each card to its row(s) regardless of whether that row gave a collector number.
  const byPrinting = new Map<string, ScryfallCard>()
  const byNameSet = new Map<string, ScryfallCard>()
  for (const card of body.data ?? []) {
    const printing = printingKey(card.set, card.collector_number)
    if (printing) byPrinting.set(printing, card)
    byNameSet.set(nameSetKey(card.name, card.set), card)
  }

  for (const row of rows) {
    const card =
      (row.collector && byPrinting.get(printingKey(row.setCode, row.collector)!)) ||
      byNameSet.get(nameSetKey(row.name, row.setCode))
    if (!card) {
      unresolved.push({ line: row.line, reason: 'No matching card found on Scryfall.' })
      continue
    }
    const imageUrl = imageOf(card)
    if (!imageUrl) {
      unresolved.push({ line: row.line, reason: 'That card has no image on Scryfall.' })
      continue
    }
    const result: CatalogResult = {
      id: card.id,
      name: row.foil ? `${card.name} (Foil)` : card.name,
      subtitle: card.set_name,
      imageUrl,
      variantKey: card.oracle_id,
    }
    items.push({ result, target: row.quantity })
  }
}

/** The Scryfall identifier for a row: an exact printing when we have one, else name+set. */
function identifierFor(row: ParsedRow): Record<string, string> {
  return row.collector
    ? { set: row.setCode, collector_number: row.collector }
    : { name: row.name, set: row.setCode }
}

function printingKey(set: string | undefined, collector: string | undefined): string | null {
  return set && collector ? `${set.toLowerCase()}/${collector.toLowerCase()}` : null
}

function nameSetKey(name: string, set: string): string {
  return `${name.toLowerCase()}/${set.toLowerCase()}`
}

/** Parse one line, auto-detecting the CSV vs. Archidekt-text shape. */
function parseLine(line: string): ParsedRow | null {
  return isCsvLine(line) ? parseCsv(line) : parseText(line)
}

/**
 * CSV if the line has a comma outside the `Nx Name (set)` text shape. The text
 * form only carries commas inside a card name (never at the start), so a comma
 * before the first parenthesis — or the absence of the `(set)` group — marks CSV.
 */
function isCsvLine(line: string): boolean {
  if (/^\d+x?\s+.+\([^)]+\)/.test(line)) return false
  return line.includes(',')
}

/** `1,"Nelly Borca, Impulsive Accuser",mkc,Foil,4` → row. */
function parseCsv(line: string): ParsedRow | null {
  const fields = splitCsv(line)
  if (fields.length < 3) return null
  const [qtyRaw, name, setCode, finish, collector] = fields
  const quantity = parseQuantity(qtyRaw)
  if (quantity === null || !name.trim() || !setCode.trim()) return null
  return {
    line,
    quantity,
    name: name.trim(),
    setCode: setCode.trim().toLowerCase(),
    collector: collector?.trim() || undefined,
    foil: !!finish && finish.trim().toLowerCase() !== 'normal',
  }
}

/** Split a single CSV line, honouring double-quoted fields (which may hold commas). */
function splitCsv(line: string): string[] {
  const fields: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"'
          i++ // an escaped quote ("") inside a quoted field
        } else inQuotes = false
      } else field += ch
    } else if (ch === '"') inQuotes = true
    else if (ch === ',') {
      fields.push(field)
      field = ''
    } else field += ch
  }
  fields.push(field)
  return fields
}

/** `1x Nelly Borca, Impulsive Accuser (mkc) 4 *F* [Draw]` → row. */
function parseText(line: string): ParsedRow | null {
  const qtyMatch = line.match(/^(\d+)x?\s+/i)
  if (!qtyMatch) return null
  const quantity = parseQuantity(qtyMatch[1])
  if (quantity === null) return null
  let rest = line.slice(qtyMatch[0].length).trim()

  // Strip the trailing `[Category]` grouping artifact, if present.
  rest = rest.replace(/\s*\[[^\]]*\]\s*$/, '').trim()

  // Strip and flag a trailing foil/etched marker (`*F*`, `*E*`).
  let foil = false
  const foilMatch = rest.match(/\s*\*([a-z])\*\s*$/i)
  if (foilMatch) {
    foil = true
    rest = rest.slice(0, foilMatch.index).trim()
  }

  // The last `(set)` group splits the name from the trailing collector number.
  const setMatch = rest.match(/\(([^)]+)\)([^()]*)$/)
  if (!setMatch) return null
  const name = rest.slice(0, setMatch.index).trim()
  if (!name) return null
  const setCode = setMatch[1].trim().toLowerCase()
  const collector = setMatch[2].trim() || undefined

  return { line, quantity, name, setCode, collector, foil }
}

/** A positive whole quantity, or null if the token isn't one. */
function parseQuantity(raw: string): number | null {
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}
