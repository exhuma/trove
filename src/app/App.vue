<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import ToastHost from './components/ToastHost.vue'
import AppHeader from './components/AppHeader.vue'
import AddSetOverlay from './components/AddSetOverlay.vue'
import WelcomeOverlay from './components/WelcomeOverlay.vue'
import { useAuth } from '@core/auth'
import { useCollection } from '@core/composables/useCollection'
import { useNeeds } from '@core/composables/useNeeds'
import { useToast } from '@core/composables/useToast'
import { useAddSetPrompt } from './composables/useAddSetPrompt'
import { useOnboarding } from './composables/useOnboarding'

// The shell owns the session→data lifecycle: load the collection when a user signs
// in (or changes), clear it and return to /login when they sign out. Token refreshes
// keep the same user id, so they don't trigger a reload.
const { session } = useAuth()
const { totals, error, loadForUser, reset, addSet } = useCollection()
const { needingCount, clearNeedsSnapshot } = useNeeds()
const { push } = useToast()
const { open: showAddSet, openAddSet, closeAddSet } = useAddSetPrompt()
const { showWelcome, ensureLoaded, reset: resetOnboarding } = useOnboarding()
const router = useRouter()

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

async function onAddSet(name: string) {
  const result = await addSet(name)
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
    />

    <!-- A load or save failed against the backend. -->
    <div v-if="error" class="border-b border-danger/40 bg-danger/10 px-6 py-2">
      <p class="mx-auto max-w-6xl text-center text-xs text-danger">{{ error }}</p>
    </div>
  </template>

  <RouterView />

  <AddSetOverlay v-if="showAddSet" @add="onAddSet" @close="closeAddSet" />
  <WelcomeOverlay v-if="session && showWelcome" />
  <ToastHost />
</template>
