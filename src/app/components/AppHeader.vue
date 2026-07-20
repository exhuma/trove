<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import TroveWordmark from '@core/components/TroveWordmark.vue'
import { useAuth } from '@core/auth'
import { useOnboarding } from '../composables/useOnboarding'

const props = defineProps<{
  sets: number
  owned: number
  wanted: number
  completeSets: number
  /** Collectibles short of their target — the count beside the Needs link. */
  needing: number
}>()
const emit = defineEmits<{ addSet: []; account: [] }>()

// The quick stats are secondary, so the meter sits thin and legend-less by default
// and only unfolds — thicker bar plus the numbered legend — when tapped. This
// `expanded` flag is ephemeral (resets each load): a glanceable bar most of the
// time, the full breakdown on demand.
const expanded = ref(false)

// The quick stats as a proportional stacked meter: each state's width is its share
// of the four values combined. A legend below carries the real numbers, so nothing
// is lost when copy-counts (owned/wanted) dwarf the set-counts (sets/complete).
// Amber marks completion, per the repo's colour convention.
const segments = computed(() => {
  const items = [
    { key: 'sets', value: props.sets, label: props.sets === 1 ? 'set' : 'sets', color: 'bg-violet' },
    { key: 'owned', value: props.owned, label: 'owned', color: 'bg-violet-bright' },
    { key: 'wanted', value: props.wanted, label: 'wanted', color: 'bg-ink-faint' },
    { key: 'complete', value: props.completeSets, label: 'complete', color: 'bg-amber' },
  ]
  const total = items.reduce((n, i) => n + i.value, 0)
  return items.map((i) => ({ ...i, pct: total ? (i.value / total) * 100 : 0 }))
})

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
        <div class="mt-1.5">
          <!-- Proportional stacked meter. Secondary info, so it stays thin and
               legend-less until tapped; the button gives a comfortable hit area
               around the slim bar and announces its expanded state. -->
          <button
            type="button"
            data-tour="stats"
            class="group block w-full py-1.5 text-left"
            :aria-expanded="expanded"
            :aria-label="`Collection stats: ${sets} sets, ${owned} owned, ${wanted} wanted, ${completeSets} complete. Tap to ${expanded ? 'collapse' : 'expand'}.`"
            @click="expanded = !expanded"
          >
            <div
              class="flex w-full gap-px overflow-hidden rounded-full bg-hall-line opacity-80 group-hover:opacity-100 motion-safe:transition-all"
              :class="expanded ? 'h-2.5' : 'h-1'"
            >
              <div
                v-for="s in segments"
                :key="s.key"
                class="h-full first:rounded-l-full last:rounded-r-full"
                :class="s.color"
                :style="{ width: s.pct + '%' }"
              />
            </div>
          </button>
          <!-- Legend: the real numbers, revealed only once the bar is expanded. -->
          <dl v-if="expanded" class="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-ink-muted">
            <div v-for="s in segments" :key="s.key" class="flex items-center gap-1">
              <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="s.color" />
              <dd class="tabular-nums text-ink">{{ s.value }}</dd>
              <dt>{{ s.label }}</dt>
            </div>
          </dl>
        </div>
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
        class="shrink-0 rounded-lg border border-hall-line p-2 text-ink-muted hover:border-violet hover:text-ink motion-safe:transition"
        aria-label="Account"
        title="Account"
        @click="emit('account')"
      >
        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7">
          <circle cx="10" cy="6.5" r="3" />
          <path d="M4 16.2a6 6 0 0 1 12 0" stroke-linecap="round" />
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
