<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Provider, UserIdentity } from '@supabase/supabase-js'
import { useAuth } from '@core/auth'
import { OAUTH_PROVIDERS, enabledOAuthProviders, loadOAuthProviders } from '@core/auth-providers'
import { useToast } from '@core/composables/useToast'
import { useInstallPrompt } from '../composables/useInstallPrompt'
import BaseOverlay from './BaseOverlay.vue'
import ProviderGlyph from './ProviderGlyph.vue'
import Spinner from './Spinner.vue'

const emit = defineEmits<{ close: [] }>()

const { user, linkIdentity, getIdentities, unlinkIdentity } = useAuth()
const { push } = useToast()
const { installOffered, install } = useInstallPrompt()

// Close this dialog before installing: the native prompt wants the page's
// attention, and the instructions overlay (the fallback) should replace this
// sheet rather than stack on top of it.
function onInstall() {
  emit('close')
  void install()
}

// Where a linked identity's confirmation toast is stashed across the full-page
// OAuth redirect that linkIdentity triggers. App.vue reads and clears it on load.
const PENDING_LINK_KEY = 'trove:pending-identity-link'

const identities = ref<UserIdentity[]>([])
const loading = ref(true)
// A single in-flight action at a time keeps the dialog simple; every button
// disables while one runs.
const acting = ref(false)
const error = ref('')
// The identity awaiting an inline "Unlink?" confirmation, if any.
const confirming = ref<UserIdentity | null>(null)

// Providers the account doesn't yet have, from the live-discovered enabled list.
const linkable = computed(() =>
  enabledOAuthProviders.value.filter(
    (p) => !identities.value.some((i) => i.provider === p.id),
  ),
)

// A last identity can't be unlinked (Supabase refuses), so the button is inert.
const canUnlink = computed(() => identities.value.length > 1)

function providerLabel(id: string): string {
  if (id === 'email') return 'Email'
  return OAUTH_PROVIDERS.find((p) => p.id === id)?.label ?? id
}

function identityEmail(identity: UserIdentity): string {
  const data = (identity.identity_data ?? {}) as Record<string, unknown>
  return (data.email as string) ?? (data.name as string) ?? ''
}

async function refresh() {
  identities.value = await getIdentities()
}

onMounted(async () => {
  // Discovery is cached, so this is cheap if the login page already ran it.
  void loadOAuthProviders()
  await refresh()
  loading.value = false
})

async function link(provider: Provider, label: string) {
  error.value = ''
  acting.value = true
  // Stash the toast before the redirect swallows in-memory state; drop it again
  // if linking fails synchronously (e.g. manual linking disabled) and no redirect
  // happens, so the marker can't fire a false "linked" toast on the next load.
  sessionStorage.setItem(PENDING_LINK_KEY, label)
  const result = await linkIdentity(provider)
  if (result.error) {
    sessionStorage.removeItem(PENDING_LINK_KEY)
    error.value = result.error
    acting.value = false
  }
  // On success the page redirects to the provider; nothing more to do here.
}

async function confirmUnlink(identity: UserIdentity) {
  error.value = ''
  acting.value = true
  const label = providerLabel(identity.provider)
  const result = await unlinkIdentity(identity)
  acting.value = false
  confirming.value = null
  if (result.error) {
    error.value = result.error
    return
  }
  await refresh()
  push(`${label} account unlinked.`)
}
</script>

<template>
  <BaseOverlay title="Account" @close="emit('close')">
    <p class="text-sm text-ink-muted">
      Signed in as
      <span class="font-medium text-ink">{{ user?.email ?? 'your account' }}</span>
    </p>

    <div v-if="loading" class="mt-6 flex items-center gap-2 text-sm text-ink-muted">
      <Spinner class="h-4 w-4" />
      Loading linked accounts…
    </div>

    <template v-else>
      <!-- What's already attached. -->
      <h3 class="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-ink-faint">
        Linked accounts
      </h3>
      <ul class="flex flex-col gap-2">
        <li
          v-for="identity in identities"
          :key="identity.identity_id"
          class="flex items-center gap-3 rounded-lg border border-hall-line px-3 py-2"
        >
          <ProviderGlyph :provider="identity.provider as Provider" />
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-medium text-ink">{{ providerLabel(identity.provider) }}</span>
            <span v-if="identityEmail(identity)" class="block truncate text-xs text-ink-muted">
              {{ identityEmail(identity) }}
            </span>
          </span>

          <!-- Inline confirm keeps the destructive step from nesting another overlay. -->
          <template v-if="confirming === identity">
            <button
              type="button"
              :disabled="acting"
              class="min-h-9 rounded-md px-2.5 py-1 text-xs font-medium text-ink-muted hover:bg-hall-panel hover:text-ink disabled:opacity-50"
              @click="confirming = null"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="acting"
              class="min-h-9 rounded-md bg-danger px-2.5 py-1 text-xs font-medium text-ink hover:brightness-110 disabled:opacity-50"
              @click="confirmUnlink(identity)"
            >
              Unlink
            </button>
          </template>
          <button
            v-else
            type="button"
            :disabled="acting || !canUnlink"
            :title="canUnlink ? undefined : 'You can’t unlink your only sign-in method.'"
            class="min-h-9 shrink-0 rounded-md border border-hall-line px-2.5 py-1 text-xs font-medium text-ink-muted hover:border-danger hover:text-ink disabled:opacity-40 disabled:hover:border-hall-line"
            @click="confirming = identity"
          >
            Unlink
          </button>
        </li>
      </ul>

      <!-- Providers not yet linked. Linking one attaches it to this account even
           when its email differs — the point of the feature. -->
      <template v-if="linkable.length">
        <h3 class="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-ink-faint">
          Link another account
        </h3>
        <div class="flex flex-col gap-2">
          <button
            v-for="provider in linkable"
            :key="provider.id"
            type="button"
            :disabled="acting"
            class="flex w-full items-center justify-center gap-2 rounded-lg border border-hall-line px-4 py-2.5 text-sm font-medium text-ink hover:border-violet disabled:opacity-50 sm:py-2"
            @click="link(provider.id, provider.label)"
          >
            <ProviderGlyph :provider="provider.id" />
            Link {{ provider.label }}
          </button>
        </div>
      </template>

      <p v-if="error" class="mt-4 text-sm text-danger">{{ error }}</p>

      <!-- Always-reachable install entry: the tour points new users here once, but
           it stays available for anyone who wants Trove on their home screen. Shown
           only when installing is actually possible (hidden once standalone). -->
      <template v-if="installOffered">
        <h3 class="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-ink-faint">
          Install app
        </h3>
        <button
          type="button"
          class="flex w-full items-center justify-center gap-2 rounded-lg border border-hall-line px-4 py-2.5 text-sm font-medium text-ink hover:border-violet sm:py-2"
          @click="onInstall"
        >
          <svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6">
            <path d="M8 2v8m0 0L5 7m3 3l3-3M3 13h10" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Install Trove
        </button>
      </template>
    </template>
  </BaseOverlay>
</template>
