/** Per-user onboarding progress: the first-run welcome plus seen guided-tour tips. */
export interface OnboardingState {
  welcomeSeen: boolean
  /** Stable tip keys already shown to the user (see src/app/onboarding/tips.ts). */
  seenTips: string[]
}

/**
 * A small persistence seam for onboarding state, mirroring `CollectionRepository`:
 * the composable talks only to this interface, so the Supabase and in-memory
 * backends are one swappable implementation. Kept separate from the collection
 * repository because onboarding progress is app-lifecycle state, not collection data.
 *
 * State is authoritative server-side per user (never localStorage) so the tour
 * follows the account across devices.
 */
export interface OnboardingRepository {
  /** The current user's state, creating the default row if none exists yet. */
  get(): Promise<OnboardingState>
  /** Mark the first-run welcome as seen (idempotent); returns the updated state. */
  markWelcomeSeen(): Promise<OnboardingState>
  /** Union the supplied shown tip keys into `seenTips`; returns the updated state. */
  markTipsSeen(keys: string[]): Promise<OnboardingState>
}
