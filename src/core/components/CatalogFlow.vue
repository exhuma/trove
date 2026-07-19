<script setup lang="ts">
import { computed, ref } from 'vue'
import CatalogStep from './CatalogStep.vue'
import type { CatalogResult, CatalogSource } from '@core/catalog'

// Drives a source's two-step flow: search, then (for sources that refine) a
// searchable choice of artwork, then a commit. Owns the between-steps state so the
// overlay doesn't have to.
const props = defineProps<{ source: CatalogSource }>()
const emit = defineEmits<{
  commit: [payload: { result: CatalogResult; name: string }]
  zoom: [result: CatalogResult]
}>()

// Both sources want a two-letter floor before the first (live-ish) search fires;
// it's a search-UX convention, not a per-source trait.
const SEARCH_MIN_CHARS = 2

// The first-step pick awaiting refinement. Null while on step 1, or for sources
// with no refine step (the pick commits immediately).
const picked = ref<CatalogResult | null>(null)

const searchStep = computed(() => ({
  searchLabel: props.source.searchLabel,
  placeholder: props.source.placeholder,
  hint: props.source.hint,
  emptyLabel: props.source.emptyLabel,
  debounceMs: props.source.debounceMs,
  minQueryLength: SEARCH_MIN_CHARS,
}))

function onSearchPick(result: CatalogResult) {
  if (props.source.refine) picked.value = result
  else emit('commit', { result, name: result.name })
}

// A stable identity (reads `picked` at call time) so the step's watcher doesn't
// re-fire on every parent render.
function refineRun(query: string, signal: AbortSignal) {
  return props.source.refine!.run(picked.value!, query, signal)
}

function onRefinePick(art: CatalogResult) {
  // The collectible keeps the booster's name; the refined art is only its picture.
  emit('commit', { result: art, name: picked.value?.name ?? art.name })
}
</script>

<template>
  <!-- Step 2: the searchable refine over the picked result. -->
  <div v-if="picked && source.refine">
    <button
      type="button"
      class="mb-2 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
      @click="picked = null"
    >
      <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M10 3L5 8l5 5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      Back to search
    </button>
    <p class="mb-3 text-sm font-medium text-ink">{{ picked.name }}</p>
    <CatalogStep :step="source.refine" :run="refineRun" @pick="onRefinePick" @zoom="(r) => emit('zoom', r)" />
  </div>

  <!-- Step 1: search the source. -->
  <CatalogStep
    v-else
    :key="source.key"
    :step="searchStep"
    :run="source.search"
    @pick="onSearchPick"
    @zoom="(r) => emit('zoom', r)"
  />
</template>
