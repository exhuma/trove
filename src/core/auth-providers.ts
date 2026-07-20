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

// Monochrome (currentColor) brand glyphs, one path per provider. The multicolour
// marks would need hex literals, which the repo forbids. viewBox is 0 0 24 24 for
// each. Shared by the login page and the account dialog via <ProviderGlyph>.
export const providerGlyphs: Partial<Record<Provider, string>> = {
  google:
    'M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z',
  github:
    'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  discord:
    'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z',
}

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
