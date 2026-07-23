<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import CatalogResultGrid from './CatalogResultGrid.vue'
import type { CatalogResult, CatalogSearchOutcome } from '@core/catalog'

// One search/filter step: a labelled search box over a `run` function, with a
// results grid. Drives both the first search and the searchable refine step.
const props = defineProps<{
  step: {
    searchLabel: string
    placeholder: string
    hint: string
    emptyLabel: string
    debounceMs: number
    // 0 auto-runs on mount (show all, filter as you type); >0 waits for N chars.
    minQueryLength: number
  }
  run: (query: string, signal: AbortSignal) => Promise<CatalogSearchOutcome>
  selectedIds?: string[]
}>()
const emit = defineEmits<{ pick: [result: CatalogResult]; zoom: [result: CatalogResult] }>()

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'results'; results: CatalogResult[] }
  | { kind: 'empty' }
  | { kind: 'error'; message: string }

const query = ref('')
const state = ref<State>({ kind: 'idle' })

let debounce: ReturnType<typeof setTimeout> | undefined
let inflight: AbortController | undefined

function cancelPending() {
  clearTimeout(debounce)
  inflight?.abort()
  inflight = undefined
}

// Debounced and abortable: a live source (Scryfall) has a rate limit to respect,
// and either way a newer keystroke should supersede an in-flight run. `immediate`
// so a zero-minimum step (refine) loads its full list the moment it mounts.
watch(
  [query, () => props.run],
  ([value]) => {
    cancelPending()
    const trimmed = value.trim()

    if (trimmed.length < props.step.minQueryLength) {
      state.value = { kind: 'idle' }
      return
    }

    state.value = { kind: 'loading' }
    debounce = setTimeout(async () => {
      const controller = new AbortController()
      inflight = controller
      try {
        const outcome = await props.run(trimmed, controller.signal)
        if (controller.signal.aborted) return
        state.value =
          outcome.status === 'results'
            ? { kind: 'results', results: outcome.results }
            : outcome.status === 'empty'
              ? { kind: 'empty' }
              : { kind: 'error', message: outcome.message }
      } catch {
        // The only throw that reaches here is an abort, which a newer keystroke
        // already superseded.
      }
    }, props.step.debounceMs)
  },
  { flush: 'post', immediate: true },
)

onBeforeUnmount(cancelPending)
</script>

<template>
  <div>
    <label for="catalog-search" class="mb-1.5 block text-sm font-medium text-ink">{{ step.searchLabel }}</label>
    <input
      id="catalog-search"
      v-model="query"
      type="search"
      :placeholder="step.placeholder"
      autocomplete="off"
      class="w-full rounded-lg border border-hall-line bg-hall px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-violet focus:outline-none"
    />
    <p class="mt-1.5 text-xs text-ink-faint">{{ step.hint }}</p>

    <div class="mt-4 min-h-[8rem]" aria-live="polite">
      <p v-if="state.kind === 'idle'" class="py-8 text-center text-sm text-ink-faint">
        Type at least two letters to search.
      </p>

      <div v-else-if="state.kind === 'loading'" class="flex items-center justify-center gap-2 py-8 text-sm text-ink-muted">
        <svg class="h-4 w-4 motion-safe:animate-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="8" cy="8" r="6" class="opacity-25" />
          <path d="M14 8a6 6 0 00-6-6" stroke-linecap="round" />
        </svg>
        Searching…
      </div>

      <p v-else-if="state.kind === 'empty'" class="py-8 text-center text-sm text-ink-muted">
        {{ step.emptyLabel }}
      </p>

      <div v-else-if="state.kind === 'error'" class="rounded-lg border border-danger/40 bg-danger/10 px-3 py-3">
        <p class="text-sm text-ink">{{ state.message }}</p>
      </div>

      <CatalogResultGrid
        v-else
        :results="state.results"
        :selected-ids="selectedIds"
        @pick="(result) => emit('pick', result)"
        @zoom="(result) => emit('zoom', result)"
      />
    </div>
  </div>
</template>
