import { boosterSource } from './boosters'
import { scryfallSource } from './scryfall'
import type { CatalogSource } from './types'

export type { CatalogResult, CatalogSearchOutcome, CatalogSource } from './types'

/**
 * The searchable sources the add-collectible dialog offers, in tab order. Add a
 * source here and a new tab appears — nothing else in the UI needs to know about it.
 */
export const CATALOG_SOURCES: CatalogSource[] = [scryfallSource, boosterSource]
