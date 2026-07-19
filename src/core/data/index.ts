import type { CollectionRepository } from './repository'
import type { OnboardingRepository } from './onboarding-repository'
import { SupabaseCollectionRepository } from './supabase-repository'
import { MemoryCollectionRepository } from './memory-repository'
import { SupabaseOnboardingRepository } from './onboarding-supabase'
import { MemoryOnboardingRepository } from './onboarding-memory'
import { useMemoryBackend } from '../dev-backend'

/**
 * The active repository. Supabase is the production target; the in-memory store
 * is a dev-only alternative (see `../dev-backend.ts`) and can never ship — the
 * flag is dead in any production build. Nothing else references a concrete impl.
 */
export const repo: CollectionRepository = useMemoryBackend
  ? new MemoryCollectionRepository()
  : new SupabaseCollectionRepository()

/** Onboarding progress seam, selected by the same dev-backend flag as `repo`. */
export const onboardingRepo: OnboardingRepository = useMemoryBackend
  ? new MemoryOnboardingRepository()
  : new SupabaseOnboardingRepository()

export type { CollectionRepository, NewCollectible } from './repository'
export type { OnboardingRepository, OnboardingState } from './onboarding-repository'
