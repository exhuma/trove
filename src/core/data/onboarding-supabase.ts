import { supabase } from '../supabase'
import type { OnboardingRepository, OnboardingState } from './onboarding-repository'

interface OnboardingRow {
  welcome_seen: boolean
  seen_tips: string[]
}

function toState(row: OnboardingRow): OnboardingState {
  return { welcomeSeen: row.welcome_seen, seenTips: row.seen_tips ?? [] }
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('You are not signed in.')
  return data.user.id
}

/**
 * Supabase implementation of the onboarding seam. RLS scopes every query to the
 * signed-in user.
 *
 * Every write goes through `upsert` keyed on `user_id` — not a bare `UPDATE`. A
 * filterless `UPDATE ... .single()` throws when it matches zero rows (the row not
 * yet created, or a race with the initial load), and that swallowed error used to
 * leave the welcome dialog stuck with unresponsive buttons. Upsert writes the row
 * whether or not it exists, and only the supplied columns are touched on conflict.
 */
export class SupabaseOnboardingRepository implements OnboardingRepository {
  async get(): Promise<OnboardingState> {
    const { data, error } = await supabase
      .from('onboarding')
      .select('welcome_seen, seen_tips')
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (data) return toState(data)
    // First visit: create the default row (idempotently).
    return this.write({ user_id: await currentUserId() })
  }

  async markWelcomeSeen(): Promise<OnboardingState> {
    return this.write({ user_id: await currentUserId(), welcome_seen: true })
  }

  async markTipsSeen(keys: string[]): Promise<OnboardingState> {
    // Read-modify-write to union keys; single-user, low-contention so no race worth
    // a Postgres-side array merge. The DB stays the source of truth for the result.
    const current = await this.get()
    const merged = [...new Set([...current.seenTips, ...keys])]
    return this.write({ user_id: await currentUserId(), seen_tips: merged })
  }

  private async write(
    row: { user_id: string; welcome_seen?: boolean; seen_tips?: string[] },
  ): Promise<OnboardingState> {
    const { data, error } = await supabase
      .from('onboarding')
      .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select('welcome_seen, seen_tips')
      .single()
    if (error) throw new Error(error.message)
    return toState(data)
  }
}
