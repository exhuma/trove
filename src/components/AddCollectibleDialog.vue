<script setup lang="ts">
import { ref } from 'vue'
import BaseDialog from './BaseDialog.vue'
import ScryfallSearch from './ScryfallSearch.vue'
import { fileToDataUrl, toStorableDataUrl } from '../lib/image'
import { fetchCardImage, type CardResult } from '../lib/scryfall'

const props = defineProps<{ setName: string; error?: string }>()
const emit = defineEmits<{
  add: [payload: { name: string; image: string }]
  zoom: [payload: { src: string; alt: string }]
  close: []
}>()

type Tab = 'upload' | 'search'
const tab = ref<Tab>('upload')

const name = ref('')
const image = ref('')
const localError = ref('')
const busy = ref(false)
const dragging = ref(false)

async function acceptFile(file: File | undefined) {
  if (!file) return
  localError.value = ''
  busy.value = true
  try {
    image.value = await fileToDataUrl(file)
    // Filename minus extension is a better default than an empty box, and the
    // user can still overwrite it.
    if (!name.value.trim()) name.value = file.name.replace(/\.[^.]+$/, '')
  } catch (err) {
    localError.value = (err as Error).message
  } finally {
    busy.value = false
  }
}

function onDrop(event: DragEvent) {
  dragging.value = false
  void acceptFile(event.dataTransfer?.files[0])
}

async function pickCard(card: CardResult) {
  localError.value = ''
  busy.value = true
  try {
    const blob = await fetchCardImage(card.imageUrl, new AbortController().signal)
    image.value = await toStorableDataUrl(blob)
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
  if (!image.value) return (localError.value = 'Add a picture first.')
  emit('add', { name: trimmed, image: image.value })
}
</script>

<template>
  <BaseDialog :title="`Add to ${props.setName}`" @close="emit('close')">
    <div class="mb-4 flex gap-1 rounded-lg bg-hall p-1" role="tablist">
      <button
        v-for="option in (['upload', 'search'] as Tab[])"
        :key="option"
        role="tab"
        :aria-selected="tab === option"
        class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium motion-safe:transition"
        :class="tab === option ? 'bg-violet text-ink' : 'text-ink-muted hover:text-ink'"
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
      <div
        class="flex items-center gap-4 rounded-lg border border-dashed p-3 motion-safe:transition"
        :class="dragging ? 'border-violet bg-violet-muted/20' : 'border-hall-line'"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
      >
        <div class="aspect-card w-20 shrink-0 overflow-hidden rounded border border-hall-line bg-hall-panel">
          <img v-if="image" :src="image" alt="Selected picture preview" class="h-full w-full object-contain" />
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
            class="inline-block cursor-pointer rounded-lg border border-hall-line px-3 py-1.5 text-sm text-ink hover:border-violet"
          >
            {{ image ? 'Choose a different picture' : 'Choose a picture' }}
            <input type="file" accept="image/*" class="sr-only" @change="acceptFile(($event.target as HTMLInputElement).files?.[0])" />
          </label>
          <p class="mt-1.5 text-xs text-ink-faint">…or drag one in. Large images are scaled down automatically.</p>
        </div>
      </div>

      <label for="collectible-name" class="mb-1.5 mt-4 block text-sm font-medium text-ink">Name</label>
      <input
        id="collectible-name"
        v-model="name"
        type="text"
        placeholder="Brightblade Stoat"
        autocomplete="off"
        class="w-full rounded-lg border border-hall-line bg-hall px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-violet focus:outline-none"
        @input="localError = ''"
      />

      <!-- Errors from the parent (a failed save) and from this form share one
           slot, so there is only ever one place to look. -->
      <p v-if="localError || props.error" class="mt-2 text-xs text-danger">{{ localError || props.error }}</p>

      <div class="mt-6 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-medium text-ink-muted hover:bg-hall-panel hover:text-ink"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="busy"
          class="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-ink hover:bg-violet-bright disabled:opacity-50"
        >
          {{ busy ? 'Working…' : 'Add collectible' }}
        </button>
      </div>
    </form>
  </BaseDialog>
</template>
