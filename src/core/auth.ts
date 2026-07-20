import { computed, ref } from 'vue'
import type { Provider, Session, UserIdentity } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { useMemoryBackend } from './dev-backend'

// Module-scope singleton: one auth state shared by every caller, mirroring the
// composable style used elsewhere (no store library).
const session = ref<Session | null>(null)
const ready = ref(false)

// Resolves once the initial session check completes, so route guards can wait for it
// instead of bouncing a signed-in user to /login on a hard refresh.
let markReady: () => void = () => {}
export const authReady = new Promise<void>((resolve) => {
  markReady = resolve
})

// A stand-in session for the in-memory dev backend: enough shape for the app,
// which only ever reads `session.user.id`. No Supabase involved.
const DEV_SESSION = { user: { id: 'dev-user' } } as unknown as Session

if (useMemoryBackend) {
  // Start signed in so a dev loop lands straight on the collection, no login step.
  session.value = DEV_SESSION
  ready.value = true
  markReady()
} else {
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
}

/** Where the magic-link email should send the user back to. */
function callbackUrl(): string {
  return `${window.location.origin}/auth/callback`
}

export type AuthResult = { error: string | null }

export function useAuth() {
  async function signUp(email: string, password: string): Promise<AuthResult> {
    if (useMemoryBackend) return signInMemory()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: callbackUrl() },
    })
    return { error: error?.message ?? null }
  }

  async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
    if (useMemoryBackend) return signInMemory()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signInWithMagicLink(email: string): Promise<AuthResult> {
    if (useMemoryBackend) return signInMemory()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl() },
    })
    return { error: error?.message ?? null }
  }

  async function signInWithOAuth(provider: Provider): Promise<AuthResult> {
    if (useMemoryBackend) return signInMemory()
    // On success Supabase redirects the whole page to the provider; the OAuth
    // return lands on /auth/callback, the same path magic-link already uses.
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl() },
    })
    return { error: error?.message ?? null }
  }

  // Attach a social identity to the *current* account. Unlike signInWithOAuth,
  // this keeps you signed in as the same user and adds the provider to your
  // identities — the only way to link a provider whose email differs from your
  // account's (automatic linking only merges matching emails). Full-page redirect,
  // returning via /auth/callback where the session already exists.
  // Requires "Manual linking" enabled on the Supabase project.
  async function linkIdentity(provider: Provider): Promise<AuthResult> {
    if (useMemoryBackend) return { error: null }
    const { error } = await supabase.auth.linkIdentity({
      provider,
      options: { redirectTo: callbackUrl() },
    })
    return { error: error?.message ?? null }
  }

  // The identities currently linked to the signed-in user, for the account dialog.
  async function getIdentities(): Promise<UserIdentity[]> {
    if (useMemoryBackend) return []
    const { data, error } = await supabase.auth.getUserIdentities()
    if (error) return []
    return data?.identities ?? []
  }

  // Detach a linked identity. Supabase refuses to remove the last one, so the UI
  // only offers this when more than one identity is linked.
  async function unlinkIdentity(identity: UserIdentity): Promise<AuthResult> {
    if (useMemoryBackend) return { error: null }
    const { error } = await supabase.auth.unlinkIdentity(identity)
    return { error: error?.message ?? null }
  }

  async function signOut(): Promise<void> {
    if (useMemoryBackend) {
      session.value = null
      return
    }
    await supabase.auth.signOut()
  }

  // In the dev backend any credential is accepted and drops you straight in.
  function signInMemory(): AuthResult {
    session.value = DEV_SESSION
    return { error: null }
  }

  return {
    session,
    ready,
    user: computed(() => session.value?.user ?? null),
    signedIn: computed(() => session.value !== null),
    signUp,
    signInWithPassword,
    signInWithMagicLink,
    signInWithOAuth,
    linkIdentity,
    getIdentities,
    unlinkIdentity,
    signOut,
  }
}
