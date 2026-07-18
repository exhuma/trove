<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import MobileSheet from './MobileSheet.vue'
import ScryfallSearch from '@core/components/ScryfallSearch.vue'
import { fileToStorableBlob, toStorableBlob } from '@core/image'
import { fetchCardImage, type CardResult } from '@core/scryfall'

const props = defineProps<{ setName: string; error?: string }>()
const emit = defineEmits<{
  add: [payload: { name: string; blob: Blob }]
  zoom: [payload: { src: string; alt: string }]
  close: []
}>()

type Tab = 'upload' | 'search'
const tab = ref<Tab>('upload')

const name = ref('')
// The chosen picture is held as a Blob (uploaded to Storage on submit); an object URL
// gives an instant local preview without a data URL round-trip.
const imageBlob = ref<Blob | null>(null)
const previewUrl = ref('')
const localError = ref('')
const busy = ref(false)

function setImage(blob: Blob) {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  imageBlob.value = blob
  previewUrl.value = URL.createObjectURL(blob)
}

onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})

async function acceptFile(file: File | undefined) {
  if (!file) return
  localError.value = ''
  busy.value = true
  try {
    setImage(await fileToStorableBlob(file))
    // Filename minus extension is a better default than an empty box, and the
    // user can still overwrite it.
    if (!name.value.trim()) name.value = file.name.replace(/\.[^.]+$/, '')
  } catch (err) {
    localError.value = (err as Error).message
  } finally {
    busy.value = false
  }
}

async function pickCard(card: CardResult) {
  localError.value = ''
  busy.value = true
  try {
    const blob = await fetchCardImage(card.imageUrl, new AbortController().signal)
    setImage(await toStorableBlob(blob))
    name.value = card.name
    tab.value = 'upload' // Falls back to the form so the pick can be confirmed.
  } catch (err) {
    localError.value = (err as Error).message
  } finally {
    busy.value = false
  }
}

function submit() {
  const trimmed = name.value.trim()
  if (!trimmed) return (localError.value = 'Give the collectible a name first.')
  if (!imageBlob.value) return (localError.value = 'Add a picture first.')
  emit('add', { name: trimmed, blob: imageBlob.value })
}
</script>

<template>
  <MobileSheet :title="`Add to ${props.setName}`" @close="emit('close')">
    <div class="mb-4 flex gap-1 rounded-lg bg-hall p-1" role="tablist">
      <button
        v-for="option in (['upload', 'search'] as Tab[])"
        :key="option"
        role="tab"
        :aria-selected="tab === option"
        class="min-h-11 flex-1 rounded-md px-3 text-sm font-medium motion-safe:transition"
        :class="tab === option ? 'bg-violet text-ink' : 'text-ink-muted'"
        @click="tab = option"
      >
        {{ option === 'upload' ? 'Upload a picture' : 'Search Scryfall' }}
      </button>
    </div>

    <ScryfallSearch
      v-if="tab === 'search'"
      @pick="pickCard"
      @zoom="(card) => emit('zoom', { src: card.imageUrl, alt: card.name })"
    />

    <form v-else @submit.prevent="submit">
      <div class="flex items-center gap-4 rounded-lg border border-hall-line p-3">
        <div class="aspect-card w-20 shrink-0 overflow-hidden rounded border border-hall-line bg-hall-panel">
          <img v-if="previewUrl" :src="previewUrl" alt="Selected picture preview" class="h-full w-full object-contain" />
          <div v-else class="grid h-full w-full place-items-center text-ink-faint">
            <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="9" cy="10" r="1.5" />
              <path d="M4 17l5-4 4 3 3-2 4 3" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
        </div>

        <div class="min-w-0">
          <label
            class="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-hall-line px-3 text-sm text-ink"
          >
            {{ imageBlob ? 'Choose a different picture' : 'Choose a picture' }}
            <input type="file" accept="image/*" class="sr-only" @change="acceptFile(($event.target as HTMLInputElement).files?.[0])" />
          </label>
          <p class="mt-1.5 text-xs text-ink-faint">Take a photo or pick one. Large images are scaled down automatically.</p>
        </div>
      </div>

      <label for="collectible-name" class="mb-1.5 mt-4 block text-sm font-medium text-ink">Name</label>
      <input
        id="collectible-name"
        v-model="name"
        type="text"
        placeholder="Brightblade Stoat"
        autocomplete="off"
        class="h-11 w-full rounded-lg border border-hall-line bg-hall px-3 text-base text-ink placeholder:text-ink-faint focus:border-violet focus:outline-none"
        @input="localError = ''"
      />

      <!-- Errors from the parent (a failed save) and from this form share one
           slot, so there is only ever one place to look. -->
      <p v-if="localError || props.error" class="mt-2 text-xs text-danger">{{ localError || props.error }}</p>

      <div class="mt-6 flex gap-2">
        <button
          type="button"
          class="min-h-11 flex-1 rounded-lg px-4 py-2 text-sm font-medium text-ink-muted hover:bg-hall-panel hover:text-ink"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="busy"
          class="min-h-11 flex-1 rounded-lg bg-violet px-4 py-2 text-sm font-medium text-ink hover:bg-violet-bright disabled:opacity-50"
        >
          {{ busy ? 'Working…' : 'Add collectible' }}
        </button>
      </div>
    </form>
  </MobileSheet>
</template>
