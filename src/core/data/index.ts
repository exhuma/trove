import type { CollectionRepository } from './repository'
import { SupabaseCollectionRepository } from './supabase-repository'

/**
 * The active repository. Swapping the backend is a one-line change here — nothing
 * else in the app references a concrete implementation.
 */
export const repo: CollectionRepository = new SupabaseCollectionRepository()

export type { CollectionRepository, NewCollectible } from './repository'
