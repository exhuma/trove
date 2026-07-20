<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import BaseOverlay from './BaseOverlay.vue'
import Spinner from './Spinner.vue'
import type { CatalogImportOutcome, CatalogSource } from '@core/catalog'

const props = defineProps<{
  setName: string
  source: CatalogSource
  // Set while the parent adds the resolved items; drives the progress line below.
  importing?: boolean
  progress?: { done: number; total: number }
}>()
const emit = defineEmits<{
  commit: [items: CatalogImportOutcome['items']]
  close: []
}>()

const text = ref('')
const resolving = ref(false)
const resolveProgress = ref<{ done: number; total: number } | null>(null)
const error = ref('')
// Null until a resolve runs; then holds what was matched and what was skipped.
const outcome = ref<CatalogImportOutcome | null>(null)
const showSkipped = ref(false)

// A resolve's fetches are aborted if the dialog closes mid-flight.
let controller: AbortController | null = null
onBeforeUnmount(() => controller?.abort())

const importer = computed(() => props.source.importer)

async function resolve() {
  const importer = props.source.importer
  if (!importer || !text.value.trim() || resolving.value) return
  error.value = ''
  outcome.value = null
  resolveProgress.value = null
  resolving.value = true
  controller = new AbortController()
  try {
    outcome.value = await importer.run(text.value, controller.signal, (done, total) => {
      resolveProgress.value = { done, total }
    })
    if (!outcome.value.items.length && !outcome.value.unresolved.length) {
      error.value = 'Nothing to import — paste an exported list first.'
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') error.value = (err as Error).message
  } finally {
    resolving.value = false
    controller = null
  }
}

function startOver() {
  outcome.value = null
  error.value = ''
}

function confirm() {
  if (outcome.value?.items.length) emit('commit', outcome.value.items)
}
</script>

<template>
  <BaseOverlay :title="`Import into ${props.setName}`" @close="emit('close')">
    <!-- Step 1: paste. Hidden once a resolve has produced a preview. -->
    <template v-if="!outcome">
      <label for="import-text" class="mb-1.5 block text-sm font-medium text-ink">
        Paste an exported card list
      </label>
      <textarea
        id="import-text"
        v-model="text"
        rows="8"
        placeholder="12x Mountain (ecl) [Land]&#10;1x Night's Whisper (ecc) 81"
        autocomplete="off"
        spellcheck="false"
        :disabled="resolving"
        class="w-full resize-y rounded-lg border border-hall-line bg-hall px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-faint focus:border-violet focus:outline-none disabled:opacity-50"
        @input="error = ''"
      />

      <details class="mt-2 text-xs text-ink-muted">
        <summary class="cursor-pointer select-none hover:text-ink">Expected format</summary>
        <pre class="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-hall p-3 text-ink-faint">{{ importer?.example }}</pre>
      </details>

      <p v-if="resolving" class="mt-3 flex items-center gap-2 text-xs text-ink-muted">
        <Spinner class="h-4 w-4" />
        <span v-if="resolveProgress">Looking up cards… {{ resolveProgress.done }}/{{ resolveProgress.total }}</span>
        <span v-else>Reading your list…</span>
      </p>
      <p v-else-if="error" class="mt-3 text-xs text-danger">{{ error }}</p>

      <div class="mt-6 flex gap-2 sm:justify-end">
        <button
          type="button"
          class="min-h-11 flex-1 rounded-lg px-4 py-2 text-sm font-medium text-ink-muted hover:bg-hall-panel hover:text-ink sm:flex-none"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          type="button"
          :disabled="resolving || !text.trim()"
          class="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-violet px-4 py-2 text-sm font-medium text-ink hover:bg-violet-bright disabled:opacity-50 sm:flex-none"
          @click="resolve"
        >
          <Spinner v-if="resolving" class="h-4 w-4" />
          {{ resolving ? 'Looking up…' : 'Resolve' }}
        </button>
      </div>
    </template>

    <!-- Step 2: preview what resolved, and what didn't, before committing. -->
    <template v-else>
      <p class="text-sm text-ink">
        <span class="font-semibold">{{ outcome.items.length }}</span>
        {{ outcome.items.length === 1 ? 'card' : 'cards' }} ready to import.
      </p>

      <div v-if="outcome.unresolved.length" class="mt-3">
        <button
          type="button"
          class="flex items-center gap-1.5 text-sm text-amber-bright hover:text-amber"
          @click="showSkipped = !showSkipped"
        >
          <svg
            class="h-3.5 w-3.5 motion-safe:transition-transform"
            :class="showSkipped ? 'rotate-90' : ''"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M6 4l4 4-4 4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          {{ outcome.unresolved.length }} {{ outcome.unresolved.length === 1 ? 'line' : 'lines' }} skipped
        </button>
        <ul v-if="showSkipped" class="mt-2 max-h-40 overflow-y-auto rounded-lg bg-hall p-3 text-xs">
          <li v-for="(miss, i) in outcome.unresolved" :key="i" class="py-0.5">
            <span class="font-mono text-ink-muted">{{ miss.line }}</span>
            <span class="text-ink-faint"> — {{ miss.reason }}</span>
          </li>
        </ul>
      </div>

      <p v-if="importing" class="mt-4 flex items-center gap-2 text-xs text-ink-muted">
        <Spinner class="h-4 w-4" />
        Importing… {{ progress?.done ?? 0 }}/{{ progress?.total ?? outcome.items.length }}
      </p>

      <div class="mt-6 flex gap-2 sm:justify-end">
        <button
          type="button"
          :disabled="importing"
          class="min-h-11 flex-1 rounded-lg px-4 py-2 text-sm font-medium text-ink-muted hover:bg-hall-panel hover:text-ink disabled:opacity-50 sm:flex-none"
          @click="startOver"
        >
          Back
        </button>
        <button
          type="button"
          :disabled="importing || !outcome.items.length"
          class="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-violet px-4 py-2 text-sm font-medium text-ink hover:bg-violet-bright disabled:opacity-50 sm:flex-none"
          @click="confirm"
        >
          <Spinner v-if="importing" class="h-4 w-4" />
          {{ importing ? 'Importing…' : `Import ${outcome.items.length} ${outcome.items.length === 1 ? 'card' : 'cards'}` }}
        </button>
      </div>
    </template>
  </BaseOverlay>
</template>
