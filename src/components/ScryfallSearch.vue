<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { SEARCH_DEBOUNCE_MS, searchCards, type CardResult } from '../lib/scryfall'

const emit = defineEmits<{ pick: [card: CardResult]; zoom: [card: CardResult] }>()

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'results'; cards: CardResult[] }
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

// Debounced and abortable because Scryfall caps /cards/search at 2 req/s and
// answers a burst with a 30-second lockout.
watch(query, (value) => {
  cancelPending()
  const trimmed = value.trim()

  if (trimmed.length < 2) {
    state.value = { kind: 'idle' }
    return
  }

  state.value = { kind: 'loading' }
  debounce = setTimeout(async () => {
    const controller = new AbortController()
    inflight = controller
    try {
      const outcome = await searchCards(trimmed, controller.signal)
      if (controller.signal.aborted) return
      state.value =
        outcome.status === 'results'
          ? { kind: 'results', cards: outcome.cards }
          : outcome.status === 'empty'
            ? { kind: 'empty' }
            : { kind: 'error', message: outcome.message }
    } catch {
      // The only throw that reaches here is an abort, which a newer keystroke
      // already superseded.
    }
  }, SEARCH_DEBOUNCE_MS)
})

onBeforeUnmount(cancelPending)
</script>

<template>
  <div>
    <label for="card-search" class="mb-1.5 block text-sm font-medium text-ink">Search Scryfall</label>
    <input
      id="card-search"
      v-model="query"
      type="search"
      placeholder="Lightning Bolt"
      autocomplete="off"
      class="w-full rounded-lg border border-hall-line bg-hall px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-violet focus:outline-none"
    />
    <p class="mt-1.5 text-xs text-ink-faint">Needs a connection. The picture is stored locally once you pick a card.</p>

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
        No cards match that name.
      </p>

      <div v-else-if="state.kind === 'error'" class="rounded-lg border border-danger/40 bg-danger/10 px-3 py-3">
        <p class="text-sm text-ink">{{ state.message }}</p>
      </div>

      <ul v-else class="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
        <li v-for="card in state.cards" :key="card.id" class="group relative">
          <button
            class="w-full overflow-hidden rounded-lg border border-hall-line bg-hall-panel hover:border-violet motion-safe:transition"
            :aria-label="`Add ${card.name} from ${card.setName}`"
            @click="emit('pick', card)"
          >
            <div class="aspect-card w-full">
              <img :src="card.imageUrl" alt="" loading="lazy" class="h-full w-full object-contain" />
            </div>
            <!-- The set name disambiguates the printings, which now share a
                 name once the search returns every distinct artwork. -->
            <span class="block truncate px-1.5 pt-1 text-left text-[10px] text-ink">{{ card.name }}</span>
            <span class="block truncate px-1.5 pb-1 text-left text-[10px] text-ink-faint">{{ card.setName }}</span>
          </button>
          <button
            class="absolute right-1 top-1 rounded-md bg-hall/80 p-1 text-ink-muted opacity-0 backdrop-blur-sm hover:bg-violet hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 motion-safe:transition"
            :aria-label="`Zoom artwork for ${card.name} from ${card.setName}`"
            @click="emit('zoom', card)"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L14 14M5 7h4M7 5v4" stroke-linecap="round" />
            </svg>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
