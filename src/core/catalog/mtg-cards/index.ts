import { toStorableBlob } from '../../image'
import type { CatalogResult, CatalogSearchOutcome, CatalogSource } from '../types'
import { imageOf, type ScryfallCard, fetchCardImage } from './scryfall'
import { mtgCardsImporter } from './import'

/**
 * Scryfall limits /cards/search to 2 requests per second and treats a 429 as a
 * 30s lockout, so callers must debounce. 500ms matches their documented floor.
 */
const SEARCH_DEBOUNCE_MS = 500

async function searchCards(query: string, signal: AbortSignal): Promise<CatalogSearchOutcome> {
  // unique=art returns one entry per distinct artwork rather than collapsing a
  // card to a single printing, so the user can pick the exact art they want.
  const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=art`

  let res: Response
  try {
    // The browser sets its own User-Agent and it cannot be overridden here,
    // which satisfies Scryfall's guidance for on-page JS.
    res = await fetch(url, { headers: { Accept: 'application/json' }, signal })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    return {
      status: 'error',
      message: "Couldn't reach Scryfall. Check your connection — you can still upload a picture instead.",
    }
  }

  // A search matching nothing is a 404 here, which is an expected outcome
  // rather than a failure.
  if (res.status === 404) return { status: 'empty' }
  if (res.status === 429) {
    return { status: 'error', message: 'Too many searches at once. Wait a moment and try again.' }
  }
  if (!res.ok) {
    return { status: 'error', message: `Scryfall returned an error (${res.status}). Try again shortly.` }
  }

  const body = (await res.json()) as { data?: ScryfallCard[] }
  const results = (body.data ?? [])
    .flatMap<CatalogResult>((card) => {
      const imageUrl = imageOf(card)
      return imageUrl ? [{ id: card.id, name: card.name, subtitle: card.set_name, imageUrl }] : []
    })
    // A generous cap because a single popular card can have many distinct
    // printings, and the user is now choosing between them.
    .slice(0, 24)

  return results.length ? { status: 'results', results } : { status: 'empty' }
}

/** The MTG single-card source: search Scryfall, add a chosen printing's full-card art. */
export const mtgCardsSource: CatalogSource = {
  key: 'scryfall',
  label: 'Cards',
  searchLabel: 'Search Scryfall',
  placeholder: 'Lightning Bolt',
  hint: 'Needs a connection. The picture is stored in your account once you pick a card.',
  fetchingLabel: 'Fetching the card image…',
  emptyLabel: 'No cards match that name.',
  debounceMs: SEARCH_DEBOUNCE_MS,
  search: searchCards,
  importer: mtgCardsImporter,
  fetchImage: async (result, signal) => toStorableBlob(await fetchCardImage(result.imageUrl, signal)),
}
