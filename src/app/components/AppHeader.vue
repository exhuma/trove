<script setup lang="ts">
import { useRoute } from 'vue-router'
import TroveWordmark from '@core/components/TroveWordmark.vue'
import { useAuth } from '@core/auth'
import { useOnboarding } from '../composables/useOnboarding'

defineProps<{
  sets: number
  owned: number
  wanted: number
  completeSets: number
  /** Collectibles short of their target — the count beside the Needs link. */
  needing: number
}>()
const emit = defineEmits<{ addSet: [] }>()

const { signOut } = useAuth()
const route = useRoute()
const { replayTour } = useOnboarding()

// Always-available entry to the guided tour, so dismissing the first-run welcome is
// never a dead end. Replays the tour for whichever section the user is on.
function takeTour() {
  replayTour(route.name === 'needs' ? 'needs' : 'collection')
}
</script>

<template>
  <header
    class="sticky top-0 z-40 border-b border-hall-line bg-hall/85 backdrop-blur-md"
    style="padding-top: env(safe-area-inset-top)"
  >
    <div class="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4 sm:px-6">
      <div class="min-w-0 flex-1">
        <!-- The banner wordmark: bold, uppercase, letterspaced, echoing the
             convention-hall signage the theme is drawn from. -->
        <h1>
          <TroveWordmark size="md" />
        </h1>
        <p class="mt-1 truncate text-xs text-ink-muted">
          {{ sets }} {{ sets === 1 ? 'set' : 'sets' }} · {{ owned }} owned · {{ wanted }} wanted
          <span v-if="completeSets" class="text-amber">· {{ completeSets }} complete</span>
        </p>
      </div>

      <!-- Section nav lives in the header from `sm` up; on phones it drops to a
           full-width switcher strip below (NavSwitcher), where there is room for
           thumb targets. exact-active-class, not active-class: "/" is a prefix of
           every route, so the Collection link would otherwise stay lit on /needs.
           Exact matching also gives us aria-current="page" for free. -->
      <nav aria-label="Sections" class="hidden shrink-0 items-center gap-1 sm:flex">
        <RouterLink
          to="/"
          exact-active-class="bg-hall-panel text-ink"
          class="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted hover:text-ink motion-safe:transition"
        >
          Collection
        </RouterLink>
        <RouterLink
          to="/needs"
          data-tour="needs-nav"
          exact-active-class="bg-hall-panel text-ink"
          class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted hover:text-ink motion-safe:transition"
        >
          Needs
          <span
            v-if="needing"
            class="rounded-full bg-amber-muted/50 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-amber-bright"
          >
            {{ needing }}
          </span>
        </RouterLink>
      </nav>

      <!-- On phones the floating action button adds sets, so the header keeps
           only the sign-out control; the "New set" button returns from `sm` up. -->
      <button
        data-tour="add-set"
        class="hidden shrink-0 items-center gap-2 rounded-lg bg-violet px-4 py-2 text-sm font-medium text-ink hover:bg-violet-bright motion-safe:transition sm:flex"
        @click="emit('addSet')"
      >
        <svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 3v10M3 8h10" stroke-linecap="round" />
        </svg>
        New set
      </button>

      <button
        class="shrink-0 rounded-lg border border-hall-line p-2 text-ink-muted hover:border-violet hover:text-ink motion-safe:transition"
        aria-label="Take a tour"
        title="Take a tour"
        @click="takeTour"
      >
        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7">
          <circle cx="10" cy="10" r="7.5" />
          <path d="M7.7 7.8a2.3 2.3 0 1 1 3.1 2.9c-.5.3-.8.7-.8 1.4" stroke-linecap="round" />
          <circle cx="10" cy="14.7" r="0.5" fill="currentColor" stroke="none" />
        </svg>
      </button>

      <button
        class="shrink-0 rounded-lg border border-hall-line px-3 py-2 text-sm font-medium text-ink-muted hover:border-violet hover:text-ink motion-safe:transition"
        @click="signOut"
      >
        Sign out
      </button>
    </div>
  </header>
</template>
