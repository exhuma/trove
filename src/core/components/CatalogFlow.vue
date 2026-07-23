<script setup lang="ts">
import { computed, ref } from 'vue'
import CatalogStep from './CatalogStep.vue'
import type { CatalogResult, CatalogSource } from '@core/catalog'

// Drives a source's two-step flow: search, then (for sources that refine) a
// searchable choice of artwork, then a multi-select commit. Owns the
// between-steps state so the overlay doesn't have to.
const props = defineProps<{
  source: CatalogSource
  // Set while the parent persists a confirmed selection; drives the progress
  // bar below and disables the confirm/clear actions meanwhile.
  saving?: boolean
  progress?: { done: number; total: number }
}>()
const emit = defineEmits<{
  commit: [items: { result: CatalogResult; name: string }[]]
  zoom: [result: CatalogResult]
}>()

// Both sources want a two-letter floor before the first (live-ish) search fires;
// it's a search-UX convention, not a per-source trait.
const SEARCH_MIN_CHARS = 2

// The first-step pick awaiting refinement. Null while on step 1, or for sources
// with no refine step (the terminal step is the search grid itself).
const picked = ref<CatalogResult | null>(null)

// The terminal step's selection — the search grid's for sources with no
// refine, the refine grid's for sources that have one. Cleared whenever the
// active terminal step changes (switching source, or stepping in/out of refine).
const selected = ref<CatalogResult[]>([])
const selectedIds = computed(() => selected.value.map((r) => r.id))

const searchStep = computed(() => ({
  searchLabel: props.source.searchLabel,
  placeholder: props.source.placeholder,
  hint: props.source.hint,
  emptyLabel: props.source.emptyLabel,
  debounceMs: props.source.debounceMs,
  minQueryLength: SEARCH_MIN_CHARS,
}))

function toggleSelected(result: CatalogResult) {
  const i = selected.value.findIndex((r) => r.id === result.id)
  selected.value = i === -1 ? [...selected.value, result] : selected.value.filter((r) => r.id !== result.id)
}

function onSearchPick(result: CatalogResult) {
  if (props.source.refine) {
    picked.value = result
    selected.value = []
  } else {
    toggleSelected(result)
  }
}

function backToSearch() {
  picked.value = null
  selected.value = []
}

// A stable identity (reads `picked` at call time) so the step's watcher doesn't
// re-fire on every parent render.
function refineRun(query: string, signal: AbortSignal) {
  return props.source.refine!.run(picked.value!, query, signal)
}

function onRefinePick(art: CatalogResult) {
  toggleSelected(art)
}

function confirm() {
  if (!selected.value.length) return
  // A booster keeps its own name regardless of which art is picked; a card
  // search result names itself.
  const refining = !!(props.source.refine && picked.value)
  const items = selected.value.map((result) => ({
    result,
    name: refining ? picked.value!.name : result.name,
  }))
  emit('commit', items)
}
</script>

<template>
  <!-- Step 2: the searchable refine over the picked result. -->
  <div v-if="picked && source.refine">
    <button
      type="button"
      class="mb-2 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
      @click="backToSearch"
    >
      <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M10 3L5 8l5 5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      Back to search
    </button>
    <p class="mb-3 text-sm font-medium text-ink">{{ picked.name }}</p>
    <CatalogStep
      :step="source.refine"
      :run="refineRun"
      :selected-ids="selectedIds"
      @pick="onRefinePick"
      @zoom="(r) => emit('zoom', r)"
    />
  </div>

  <!-- Step 1: search the source. -->
  <CatalogStep
    v-else
    :key="source.key"
    :step="searchStep"
    :run="source.search"
    :selected-ids="selectedIds"
    @pick="onSearchPick"
    @zoom="(r) => emit('zoom', r)"
  />

  <!-- Selection bar: confirm a batch add, or show its progress once submitted. -->
  <div
    v-if="selected.length || saving"
    class="mt-3 flex items-center justify-between gap-3 rounded-lg border border-hall-line bg-hall-panel px-3 py-2"
  >
    <p v-if="saving" class="flex items-center gap-2 text-xs text-ink-muted">
      <svg class="h-4 w-4 motion-safe:animate-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="8" cy="8" r="6" class="opacity-25" />
        <path d="M14 8a6 6 0 00-6-6" stroke-linecap="round" />
      </svg>
      Adding… {{ progress?.done ?? 0 }}/{{ progress?.total ?? selected.length }}
    </p>
    <p v-else class="text-sm text-ink">{{ selected.length }} selected</p>
    <div v-if="!saving" class="flex gap-2">
      <button type="button" class="text-sm text-ink-muted hover:text-ink" @click="selected = []">Clear</button>
      <button
        type="button"
        class="rounded-lg bg-violet px-3 py-1.5 text-sm font-medium text-ink hover:bg-violet-bright"
        @click="confirm"
      >
        Add {{ selected.length }}
      </button>
    </div>
  </div>
</template>
