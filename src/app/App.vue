<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ToastHost from './components/ToastHost.vue'
import UpdateBanner from './components/UpdateBanner.vue'
import InstallInstructions from './components/InstallInstructions.vue'
import AppHeader from './components/AppHeader.vue'
import AddSetOverlay from './components/AddSetOverlay.vue'
import AccountOverlay from './components/AccountOverlay.vue'
import WelcomeOverlay from './components/WelcomeOverlay.vue'
import { useAuth } from '@core/auth'
import { useCollection } from '@core/composables/useCollection'
import { useNeeds } from '@core/composables/useNeeds'
import { useToast } from '@core/composables/useToast'
import { useAddSetPrompt } from './composables/useAddSetPrompt'
import { useAccountPrompt } from './composables/useAccountPrompt'
import { useInstallPrompt } from './composables/useInstallPrompt'
import { useOnboarding } from './composables/useOnboarding'

// The shell owns the session→data lifecycle: load the collection when a user signs
// in (or changes), clear it and return to /login when they sign out. Token refreshes
// keep the same user id, so they don't trigger a reload.
const { session } = useAuth()
const { totals, error, loadForUser, reset, addSet } = useCollection()
const { needingCount, clearNeedsSnapshot } = useNeeds()
const { push } = useToast()
const { open: showAddSet, openAddSet, closeAddSet } = useAddSetPrompt()
const { open: showAccount, openAccount, closeAccount } = useAccountPrompt()
// Imported here (not only in a child) so the module — and its boot-time
// beforeinstallprompt listener — evaluates on every route, including /login.
const { guideOpen, closeGuide } = useInstallPrompt()
const { showWelcome, ensureLoaded, reset: resetOnboarding } = useOnboarding()
const router = useRouter()

// linkIdentity does a full-page redirect, so the success toast can't fire in place;
// AccountOverlay leaves a marker in sessionStorage that we pick up once the browser
// lands back here.
onMounted(() => {
  const linked = sessionStorage.getItem('trove:pending-identity-link')
  if (linked) {
    sessionStorage.removeItem('trove:pending-identity-link')
    push(`${linked} account linked.`)
  }
})

watch(
  session,
  (next, prev) => {
    if (next && next.user.id !== prev?.user?.id) {
      void loadForUser()
      // Non-throwing: a failed load simply leaves the welcome gate closed.
      void ensureLoaded()
    } else if (!next && prev) {
      reset()
      clearNeedsSnapshot()
      resetOnboarding()
      void router.push('/login')
    }
  },
  { immediate: true },
)

const savingSet = ref(false)

async function onAddSet(name: string) {
  savingSet.value = true
  let result
  try {
    result = await addSet(name)
  } finally {
    savingSet.value = false
  }
  if (!result.ok) return push(result.message, { tone: 'error' })
  closeAddSet()
  push(`Created “${name}”.`)
  // Created from the needs list, where a brand-new empty set would be invisible —
  // show the user what they just made.
  if (router.currentRoute.value.name !== 'collection') void router.push('/')
}
</script>

<template>
  <!-- Header, error banner and the add-set dialog are app chrome rather than
       collection chrome: they persist across every authenticated route. -->
  <template v-if="session">
    <AppHeader
      :sets="totals.sets"
      :owned="totals.owned"
      :wanted="totals.wanted"
      :complete-sets="totals.completeSets"
      :needing="needingCount"
      @add-set="openAddSet"
      @account="openAccount"
    />

    <!-- A load or save failed against the backend. -->
    <div v-if="error" class="border-b border-danger/40 bg-danger/10 px-6 py-2">
      <p class="mx-auto max-w-6xl text-center text-xs text-danger">{{ error }}</p>
    </div>
  </template>

  <RouterView />

  <AddSetOverlay v-if="showAddSet" :saving="savingSet" @add="onAddSet" @close="closeAddSet" />
  <AccountOverlay v-if="session && showAccount" @close="closeAccount" />
  <WelcomeOverlay v-if="session && showWelcome" />
  <UpdateBanner />
  <!-- Mounted regardless of session so the install steps are reachable from the
       signed-out landing page too. -->
  <InstallInstructions v-if="guideOpen" @close="closeGuide" />
  <ToastHost />
</template>
