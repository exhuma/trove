<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import BaseOverlay from './BaseOverlay.vue'
import Spinner from './Spinner.vue'
import CatalogFlow from '@core/components/CatalogFlow.vue'
import { fileToStorableBlob } from '@core/image'
import { CATALOG_SOURCES, type CatalogResult, type CatalogSource } from '@core/catalog'

const props = defineProps<{
  setName: string
  error?: string
  saving?: boolean
  // Set while a confirmed catalogue selection is being persisted; drives
  // CatalogFlow's own progress bar.
  addingMany?: boolean
  addManyProgress?: { done: number; total: number }
}>()
const emit = defineEmits<{
  add: [payload: { name: string; blob: Blob }]
  'add-many': [payload: { source: CatalogSource; items: { result: CatalogResult; name: string }[] }]
  zoom: [payload: { src: string; alt: string }]
  close: []
}>()

// The first tab uploads a picture; the rest are catalogue sources (Cards,
// Boosters, …), so adding a source in `@core/catalog` grows this bar for free.
const UPLOAD = 'upload'
const tabs = [
  { key: UPLOAD, label: 'Upload' },
  ...CATALOG_SOURCES.map((source) => ({ key: source.key, label: source.label })),
]
const tab = ref<string>(UPLOAD)
const activeSource = computed(() => CATALOG_SOURCES.find((source) => source.key === tab.value))

const name = ref('')
// The chosen picture is held as a Blob (uploaded to Storage on submit); an object URL
// gives an instant local preview without a data URL round-trip.
const imageBlob = ref<Blob | null>(null)
const previewUrl = ref('')
const localError = ref('')
const busy = ref(false)
// Drag-and-drop is a desktop affordance; the handlers stay wired but are simply
// inert on touch, where the file input (with camera capture) does the job.
const dragging = ref(false)

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

function onDrop(event: DragEvent) {
  dragging.value = false
  void acceptFile(event.dataTransfer?.files[0])
}

// The flow yields a confirmed multi-select — every item already carries the
// name to give its collectible (a booster keeps its own name even though its
// picture is a refined card art). Fetching the image and persisting each one
// is the parent's job (it owns `addCollectible`), same as bulk import.
function onCommitMany(items: { result: CatalogResult; name: string }[]) {
  const source = activeSource.value
  if (!source || !items.length) return
  emit('add-many', { source, items })
}

function submit() {
  const trimmed = name.value.trim()
  if (!trimmed) return (localError.value = 'Give the collectible a name first.')
  if (!imageBlob.value) return (localError.value = 'Add a picture first.')
  emit('add', { name: trimmed, blob: imageBlob.value })
}
</script>

<template>
  <BaseOverlay :title="`Add to ${props.setName}`" @close="emit('close')">
    <div class="mb-4 flex gap-1 rounded-lg bg-hall p-1" role="tablist">
      <button
        v-for="option in tabs"
        :key="option.key"
        role="tab"
        :aria-selected="tab === option.key"
        class="min-h-11 flex-1 rounded-md px-3 text-sm font-medium motion-safe:transition sm:min-h-0 sm:py-1.5"
        :class="tab === option.key ? 'bg-violet text-ink' : 'text-ink-muted hover:text-ink'"
        @click="tab = option.key"
      >
        {{ option.label }}
      </button>
    </div>

    <template v-if="activeSource">
      <!-- The source's search → (optional) artwork-refine → multi-select commit
           flow. Fetching images and persisting is the parent's job; this overlay
           just forwards the confirmed selection. -->
      <CatalogFlow
        :key="activeSource.key"
        :source="activeSource"
        :saving="addingMany"
        :progress="addManyProgress"
        @commit="onCommitMany"
        @zoom="(result) => emit('zoom', { src: result.imageUrl, alt: result.name })"
      />
    </template>

    <form v-else @submit.prevent="submit">
      <div
        class="flex items-center gap-4 rounded-lg border border-dashed p-3 motion-safe:transition"
        :class="dragging ? 'border-violet bg-violet-muted/20' : 'border-hall-line'"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
      >
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
            class="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-hall-line px-3 text-sm text-ink hover:border-violet sm:min-h-0 sm:py-1.5"
          >
            {{ imageBlob ? 'Choose a different picture' : 'Choose a picture' }}
            <input type="file" accept="image/*" class="sr-only" @change="acceptFile(($event.target as HTMLInputElement).files?.[0])" />
          </label>
          <p class="mt-1.5 text-xs text-ink-faint">
            Take a photo, pick one, or drag one in. Large images are scaled down automatically.
          </p>
        </div>
      </div>

      <label for="collectible-name" class="mb-1.5 mt-4 block text-sm font-medium text-ink">Name</label>
      <input
        id="collectible-name"
        v-model="name"
        type="text"
        placeholder="Brightblade Stoat"
        autocomplete="off"
        class="h-11 w-full rounded-lg border border-hall-line bg-hall px-3 text-base text-ink placeholder:text-ink-faint focus:border-violet focus:outline-none sm:h-auto sm:py-2 sm:text-sm"
        @input="localError = ''"
      />

      <!-- Errors from the parent (a failed save) and from this form share one
           slot, so there is only ever one place to look. -->
      <p v-if="localError || props.error" class="mt-2 text-xs text-danger">{{ localError || props.error }}</p>

      <div class="mt-6 flex gap-2 sm:justify-end">
        <button
          type="button"
          :disabled="props.saving"
          class="min-h-11 flex-1 rounded-lg px-4 py-2 text-sm font-medium text-ink-muted hover:bg-hall-panel hover:text-ink disabled:opacity-50 sm:flex-none"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="busy || props.saving"
          class="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-violet px-4 py-2 text-sm font-medium text-ink hover:bg-violet-bright disabled:opacity-50 sm:flex-none"
        >
          <Spinner v-if="busy || props.saving" class="h-4 w-4" />
          {{ props.saving ? 'Adding…' : busy ? 'Working…' : 'Add collectible' }}
        </button>
      </div>
    </form>
  </BaseOverlay>
</template>
