import { mtgCardsSource } from './mtg-cards'
import { mtgBoostersSource } from './mtg-boosters'
import type { CatalogSource } from './types'

export type {
  CatalogImporter,
  CatalogImportItem,
  CatalogImportOutcome,
  CatalogRefineStep,
  CatalogResult,
  CatalogSearchOutcome,
  CatalogSource,
} from './types'

/**
 * The collectible-type sources the add-collectible dialog offers, in tab order.
 * Each lives in its own folder owning its search, refine, deps, and display. Add a
 * source here and a new tab appears — nothing else in the UI needs to know about it.
 */
export const CATALOG_SOURCES: CatalogSource[] = [mtgCardsSource, mtgBoostersSource]
