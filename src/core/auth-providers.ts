/**
 * OAuth provider discovery. Which social-login providers to show is decided at
 * runtime, not build time: GoTrue exposes a public settings endpoint
 * (`GET {supabaseUrl}/auth/v1/settings`) that reports which external providers
 * are enabled, so toggling one in the Supabase dashboard takes effect on the
 * next login-page load with no rebuild.
 *
 * This is the single access point for that config, mirroring `config.ts` /
 * `version.ts`: components read `enabledOAuthProviders`, never `fetch` the
 * endpoint themselves.
 */

import { ref } from 'vue'
import type { Provider } from '@supabase/supabase-js'
import { config } from './config'
import { useMemoryBackend } from './dev-backend'

export type ProviderInfo = { id: Provider; label: string }

// The allow-list: providers we ship a button (label + glyph) for. We only ever
// render one of these, even if the server reports others as enabled. Order here
// is the order the buttons appear in.
export const OAUTH_PROVIDERS: readonly ProviderInfo[] = [
  { id: 'google', label: 'Google' },
  { id: 'github', label: 'GitHub' },
  { id: 'discord', label: 'Discord' },
] as const

// Module-scope singleton, like the rest of the composable layer: the live list
// of providers to show, empty until discovery resolves (or if it fails).
export const enabledOAuthProviders = ref<ProviderInfo[]>([])

// The subset of GoTrue's settings response we read.
type AuthSettings = { external?: Partial<Record<Provider, boolean>> }

let loaded = false

/**
 * Populate `enabledOAuthProviders` from GoTrue's settings endpoint. Cached after
 * the first successful (or memory-backend) run — a fresh page load still picks
 * up dashboard changes. Never throws: a failed discovery just leaves the list
 * empty, so email/password and magic-link remain usable.
 */
export async function loadOAuthProviders(): Promise<void> {
  if (loaded) return

  // The in-memory dev backend never contacts Supabase; show the full catalogue
  // so the buttons are visible for UI work.
  if (useMemoryBackend) {
    enabledOAuthProviders.value = [...OAUTH_PROVIDERS]
    loaded = true
    return
  }

  try {
    const res = await fetch(`${config.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: config.supabasePublishableKey },
    })
    if (!res.ok) return
    const settings = (await res.json()) as AuthSettings
    const external = settings.external ?? {}
    enabledOAuthProviders.value = OAUTH_PROVIDERS.filter((p) => external[p.id] === true)
    loaded = true
  } catch {
    // Offline or unexpected shape — degrade to no social buttons.
  }
}
