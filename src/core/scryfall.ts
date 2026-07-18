export interface CardResult {
  id: string
  name: string
  setName: string
  /** Full card image — never an art crop, which would need separate credits. */
  imageUrl: string
}

export type SearchOutcome =
  | { status: 'results'; cards: CardResult[] }
  | { status: 'empty' }
  | { status: 'error'; message: string }

/**
 * Scryfall limits /cards/search to 2 requests per second and treats a 429 as a
 * 30s lockout, so callers must debounce. 500ms matches their documented floor.
 */
export const SEARCH_DEBOUNCE_MS = 500

interface ScryfallCard {
  id: string
  name: string
  set_name: string
  image_uris?: { normal?: string }
  card_faces?: { image_uris?: { normal?: string } }[]
}

/** Double-faced cards carry no top-level image_uris; the front face has it. */
function imageOf(card: ScryfallCard): string | undefined {
  return card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal
}

export async function searchCards(query: string, signal: AbortSignal): Promise<SearchOutcome> {
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
  const cards = (body.data ?? [])
    .flatMap((card) => {
      const imageUrl = imageOf(card)
      return imageUrl ? [{ id: card.id, name: card.name, setName: card.set_name, imageUrl }] : []
    })
    // A generous cap because a single popular card can have many distinct
    // printings, and the user is now choosing between them.
    .slice(0, 24)

  return cards.length ? { status: 'results', cards } : { status: 'empty' }
}

/** Fetches a chosen card's image as a Blob, ready to downscale and store. */
export async function fetchCardImage(url: string, signal: AbortSignal): Promise<Blob> {
  // Scryfall's image CDN answers with `Access-Control-Allow-Origin: *` — but only
  // when the cached entry was created by a request that carried an Origin. A prior
  // non-CORS hit (a crawler, a prefetch) can poison the cache with a header-less
  // copy that then blocks the browser's cross-origin fetch. A per-request cache
  // buster sidesteps that entry, so the CDN serves a fresh, CORS-enabled response.
  const busted = `${url}${url.includes('?') ? '&' : '?'}cors=${Date.now()}`
  const res = await fetch(busted, { signal, mode: 'cors' })
  if (!res.ok) throw new Error(`Could not download that card image (${res.status}).`)
  return res.blob()
}
