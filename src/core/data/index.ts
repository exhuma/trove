import type { CollectionRepository } from './repository'
import { SupabaseCollectionRepository } from './supabase-repository'
import { MemoryCollectionRepository } from './memory-repository'
import { useMemoryBackend } from '../dev-backend'

/**
 * The active repository. Supabase is the production target; the in-memory store
 * is a dev-only alternative (see `../dev-backend.ts`) and can never ship — the
 * flag is dead in any production build. Nothing else references a concrete impl.
 */
export const repo: CollectionRepository = useMemoryBackend
  ? new MemoryCollectionRepository()
  : new SupabaseCollectionRepository()

export type { CollectionRepository, NewCollectible } from './repository'
