import type { OnboardingRepository, OnboardingState } from './onboarding-repository'

/**
 * In-memory onboarding state for the dev backend (see `src/core/dev-backend.ts`).
 * State lives for the page session and resets on a hard reload — enough to drive
 * and re-test the welcome + tour flow locally without Supabase. Returns clones so
 * callers can't mutate the store behind its methods' backs.
 */
export class MemoryOnboardingRepository implements OnboardingRepository {
  private state: OnboardingState = { welcomeSeen: false, seenTips: [] }

  private clone(): OnboardingState {
    return { welcomeSeen: this.state.welcomeSeen, seenTips: [...this.state.seenTips] }
  }

  async get(): Promise<OnboardingState> {
    return this.clone()
  }

  async markWelcomeSeen(): Promise<OnboardingState> {
    this.state.welcomeSeen = true
    return this.clone()
  }

  async markTipsSeen(keys: string[]): Promise<OnboardingState> {
    this.state.seenTips = [...new Set([...this.state.seenTips, ...keys])]
    return this.clone()
  }
}
