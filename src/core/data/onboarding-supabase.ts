import { supabase } from '../supabase'
import type { OnboardingRepository, OnboardingState } from './onboarding-repository'

interface OnboardingRow {
  welcome_seen: boolean
  seen_tips: string[]
}

function toState(row: OnboardingRow): OnboardingState {
  return { welcomeSeen: row.welcome_seen, seenTips: row.seen_tips ?? [] }
}

/**
 * Supabase implementation of the onboarding seam. RLS scopes every query to the
 * signed-in user, and the row's `user_id` defaults to `auth.uid()`, so no explicit
 * user filter is needed on reads or the initial insert.
 */
export class SupabaseOnboardingRepository implements OnboardingRepository {
  async get(): Promise<OnboardingState> {
    const { data, error } = await supabase
      .from('onboarding')
      .select('welcome_seen, seen_tips')
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (data) return toState(data)

    // First visit: create the default row (user_id defaults to auth.uid()).
    const { data: created, error: insertError } = await supabase
      .from('onboarding')
      .insert({})
      .select('welcome_seen, seen_tips')
      .single()
    if (insertError) throw new Error(insertError.message)
    return toState(created)
  }

  async markWelcomeSeen(): Promise<OnboardingState> {
    // `get()` runs first (ensureLoaded), so the row already exists; update in place.
    const { data, error } = await supabase
      .from('onboarding')
      .update({ welcome_seen: true, updated_at: new Date().toISOString() })
      .select('welcome_seen, seen_tips')
      .single()
    if (error) throw new Error(error.message)
    return toState(data)
  }

  async markTipsSeen(keys: string[]): Promise<OnboardingState> {
    // Read-modify-write to union keys; single-user, low-contention so no race worth
    // a Postgres-side array merge. The DB stays the source of truth for the result.
    const current = await this.get()
    const merged = [...new Set([...current.seenTips, ...keys])]
    const { data, error } = await supabase
      .from('onboarding')
      .update({ seen_tips: merged, updated_at: new Date().toISOString() })
      .select('welcome_seen, seen_tips')
      .single()
    if (error) throw new Error(error.message)
    return toState(data)
  }
}
