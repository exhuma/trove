/**
 * Shared Scryfall plumbing for the MTG-cards source: the slice of the API's card
 * shape we read, how to pick a card's image, and how to download it as a Blob.
 * Both the single-card search (`index.ts`) and the bulk importer (`import.ts`)
 * build on these, so they live here rather than being duplicated.
 */

export interface ScryfallCard {
  id: string
  oracle_id: string // shared across all printings of "the same card"
  name: string
  set: string // the lowercase set code, e.g. "mkc"
  set_name: string
  collector_number: string
  image_uris?: { normal?: string }
  card_faces?: { image_uris?: { normal?: string } }[]
}

/** Double-faced cards carry no top-level image_uris; the front face has it. */
export function imageOf(card: ScryfallCard): string | undefined {
  return card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal
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
