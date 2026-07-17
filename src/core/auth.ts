import { computed, ref } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

// Module-scope singleton: one auth state shared by every caller, mirroring the
// composable style used elsewhere (no store library).
const session = ref<Session | null>(null)
const ready = ref(false)

// Resolves once the initial session check completes, so route guards can wait for it
// instead of bouncing a signed-in user to /login on a hard refresh.
let markReady: () => void
export const authReady = new Promise<void>((resolve) => {
  markReady = resolve
})

// Seed from any persisted session, then keep it live. `onAuthStateChange` also fires
// after the magic-link redirect is detected on the callback route.
void supabase.auth.getSession().then(({ data }) => {
  session.value = data.session
  ready.value = true
  markReady()
})
supabase.auth.onAuthStateChange((_event, next) => {
  session.value = next
})

/** Where the magic-link email should send the user back to. */
function callbackUrl(): string {
  return `${window.location.origin}/auth/callback`
}

export type AuthResult = { error: string | null }

export function useAuth() {
  async function signUp(email: string, password: string): Promise<AuthResult> {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: callbackUrl() },
    })
    return { error: error?.message ?? null }
  }

  async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signInWithMagicLink(email: string): Promise<AuthResult> {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl() },
    })
    return { error: error?.message ?? null }
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut()
  }

  return {
    session,
    ready,
    user: computed(() => session.value?.user ?? null),
    signedIn: computed(() => session.value !== null),
    signUp,
    signInWithPassword,
    signInWithMagicLink,
    signOut,
  }
}
