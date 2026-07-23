<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import SetCard from '../components/SetCard.vue'
import SetDetail from '../components/SetDetail.vue'
import NavSwitcher from '../components/NavSwitcher.vue'
import AddCollectibleOverlay from '../components/AddCollectibleOverlay.vue'
import BulkImportOverlay from '../components/BulkImportOverlay.vue'
import ConfirmOverlay from '../components/ConfirmOverlay.vue'
import EmptyState from '../components/EmptyState.vue'
import FanContentFooter from '../components/FanContentFooter.vue'
import ImageLightbox from '../components/ImageLightbox.vue'
import { useCollection } from '@core/composables/useCollection'
import { useNeeds } from '@core/composables/useNeeds'
import { useToast } from '@core/composables/useToast'
import { useAddSetPrompt } from '../composables/useAddSetPrompt'
import { useOnboarding } from '../composables/useOnboarding'
import { CATALOG_SOURCES, type CatalogImportItem, type CatalogResult, type CatalogSource } from '@core/catalog'
import type { CollectibleSet } from '@core/types'

// Header, error banner and the add-set dialog now live in the shell (App.vue) so
// they persist across the collection and needs routes; this view drives only the
// set list, the set detail, and the per-collectible overlays.
const { sets, loading, removeSet, addCollectible, removeCollectible, setOwnedCount, setTarget } =
  useCollection()
const { needingCount } = useNeeds()
const { push } = useToast()
const { open: showAddSet, openAddSet } = useAddSetPrompt()
const { startTour } = useOnboarding()

// Trickle in this view's tips on each visit (gated behind the welcome intro; the
// welcome overlay kicks off the first run directly). Runner skips missing anchors.
onMounted(() => void startTour('collection'))

function onSetOwned(id: string, count: number) {
  if (!openSetId.value) return
  const result = setOwnedCount(openSetId.value, id, count)
  if (!result.ok) push(result.message, { tone: 'error' })
}

function onSetTarget(id: string, target: number) {
  if (!openSetId.value) return
  const result = setTarget(openSetId.value, id, target)
  if (!result.ok) push(result.message, { tone: 'error' })
}

const openSetId = ref<string | null>(null)
const openSet = computed(() => sets.value.find((s) => s.id === openSetId.value) ?? null)

const showAddCollectible = ref(false)
const addCollectibleError = ref('')
const savingCollectible = ref(false)
const addingMany = ref(false)
const addManyProgress = ref({ done: 0, total: 0 })

// Bulk import is offered by any catalogue source with an importer (only MTG
// cards today); the overlay drives that one source.
const importSource = CATALOG_SOURCES.find((s) => s.importer)
const showImport = ref(false)
const importing = ref(false)
const importProgress = ref({ done: 0, total: 0 })

// A single lightbox serves every zoom source (collection tiles and search
// thumbnails), so its state lives here at the root.
const zoomImage = ref<{ src: string; alt: string } | null>(null)

function zoomCollectible(set: CollectibleSet, id: string) {
  const card = set.collectibles.find((c) => c.id === id)
  if (card) zoomImage.value = { src: card.image, alt: card.name }
}

// One pending-confirmation ref per target type, so the dialog knows what it is
// about to delete without a discriminated union.
const setPendingDelete = ref<CollectibleSet | null>(null)
const collectiblePendingDelete = ref<{ setId: string; id: string; name: string } | null>(null)

// The phone FAB is contextual (add a set on the list, a collectible inside a
// set) and hides whenever an overlay or the lightbox is open so it never sits
// over a form. On `sm` up the FAB is display:none and the header/detail buttons
// take over, so this only matters on narrow screens.
const overlayOpen = computed(
  () =>
    showAddSet.value ||
    showAddCollectible.value ||
    showImport.value ||
    !!setPendingDelete.value ||
    !!collectiblePendingDelete.value ||
    !!zoomImage.value,
)

function onFab() {
  if (openSet.value) {
    addCollectibleError.value = ''
    showAddCollectible.value = true
  } else {
    openAddSet()
  }
}

async function onAddCollectible(payload: { name: string; blob: Blob }) {
  if (!openSetId.value) return
  savingCollectible.value = true
  let result
  try {
    result = await addCollectible(openSetId.value, payload)
  } finally {
    savingCollectible.value = false
  }
  if (!result.ok) {
    // Left open with its input intact, so nothing the user typed is lost.
    addCollectibleError.value = result.message
    return
  }
  addCollectibleError.value = ''
  showAddCollectible.value = false
  push(`Added “${payload.name}”.`)
}

// A confirmed multi-select from the add-collectible dialog: fetch each pick's
// image and add it through the same per-row seam as a single add. Mirrors
// `onImport` below — sequential keeps the CDN load and memory sane.
async function onAddMany(payload: { source: CatalogSource; items: { result: CatalogResult; name: string }[] }) {
  if (!openSetId.value || addingMany.value) return
  addingMany.value = true
  addManyProgress.value = { done: 0, total: payload.items.length }
  const signal = new AbortController().signal
  let added = 0
  let failed = 0
  try {
    for (const item of payload.items) {
      try {
        const blob = await payload.source.fetchImage(item.result, signal)
        const result = await addCollectible(openSetId.value, {
          name: item.name,
          blob,
          variantKey: item.result.variantKey,
        })
        result.ok ? added++ : failed++
      } catch {
        failed++
      }
      addManyProgress.value = { done: added + failed, total: payload.items.length }
    }
  } finally {
    addingMany.value = false
  }
  showAddCollectible.value = false
  const summary = `Added ${added} ${added === 1 ? 'collectible' : 'collectibles'}.`
  push(failed ? `${summary} ${failed} couldn’t be added.` : summary, failed ? { tone: 'error' } : undefined)
}

// Resolve happens inside the overlay; here we fetch each card's image and add it
// through the same per-row seam as a single add. Sequential keeps the CDN load
// and memory sane, and lets the grid fill in as it goes.
async function onImport(items: CatalogImportItem[]) {
  if (!openSetId.value || !importSource || importing.value) return
  importing.value = true
  importProgress.value = { done: 0, total: items.length }
  const signal = new AbortController().signal
  let added = 0
  let failed = 0
  try {
    for (const item of items) {
      try {
        const blob = await importSource.fetchImage(item.result, signal)
        const result = await addCollectible(openSetId.value, {
          name: item.result.name,
          blob,
          target: item.target,
          variantKey: item.result.variantKey,
        })
        result.ok ? added++ : failed++
      } catch {
        failed++
      }
      importProgress.value = { done: added + failed, total: items.length }
    }
  } finally {
    importing.value = false
  }
  showImport.value = false
  const summary = `Imported ${added} ${added === 1 ? 'collectible' : 'collectibles'}.`
  push(failed ? `${summary} ${failed} couldn’t be added.` : summary, failed ? { tone: 'error' } : undefined)
}

async function confirmDeleteSet() {
  const target = setPendingDelete.value
  if (!target) return
  setPendingDelete.value = null
  if (openSetId.value === target.id) openSetId.value = null
  const undo = await removeSet(target.id)
  if (undo) push(`Deleted “${target.name}”.`, { undo })
}

async function confirmDeleteCollectible() {
  const target = collectiblePendingDelete.value
  if (!target) return
  collectiblePendingDelete.value = null
  const undo = await removeCollectible(target.setId, target.id)
  if (undo) push(`Removed “${target.name}”.`, { undo })
}

function deleteSetMessage(set: CollectibleSet) {
  const count = set.collectibles.length
  return count
    ? `“${set.name}” and its ${count} ${count === 1 ? 'collectible' : 'collectibles'} will be deleted. You can undo this straight afterwards.`
    : `“${set.name}” will be deleted. You can undo this straight afterwards.`
}
</script>

<template>
  <!-- Phone section nav; hidden inside a set, where the detail wants the screen.
       On `sm` up the nav lives in the header instead. -->
  <NavSwitcher v-if="!openSet" :needing="needingCount" />

  <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
    <div v-if="loading && !sets.length" class="flex items-center justify-center gap-2 py-16 text-sm text-ink-muted">
      <svg class="h-4 w-4 motion-safe:animate-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="8" cy="8" r="6" class="opacity-25" />
        <path d="M14 8a6 6 0 00-6-6" stroke-linecap="round" />
      </svg>
      Loading your collection…
    </div>

    <SetDetail
      v-else-if="openSet"
      :set="openSet"
      @back="openSetId = null"
      @add="((addCollectibleError = ''), (showAddCollectible = true))"
      @import="showImport = true"
      @set-owned="onSetOwned"
      @set-target="onSetTarget"
      @zoom="(id) => zoomCollectible(openSet!, id)"
      @remove="
        (id) =>
          (collectiblePendingDelete = {
            setId: openSet!.id,
            id,
            name: openSet!.collectibles.find((c) => c.id === id)?.name ?? 'this collectible',
          })
      "
    />

    <template v-else>
      <EmptyState
        v-if="!sets.length"
        title="No sets yet"
        hint="A set groups collectibles together — a Magic expansion, a sticker album, whatever you collect."
      >
        <button
          class="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-ink hover:bg-violet-bright"
          @click="openAddSet"
        >
          Create your first set
        </button>
      </EmptyState>

      <ul v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="(set, i) in sets" :key="set.id" :data-tour="i === 0 ? 'set-card' : undefined">
          <SetCard :set="set" @open="openSetId = set.id" @remove="setPendingDelete = set" />
        </li>
      </ul>
    </template>
  </main>

  <FanContentFooter />

  <!-- Phone-only floating add button; the header / detail buttons cover `sm` up. -->
  <button
    v-if="!overlayOpen && !(loading && !sets.length)"
    :data-tour="openSet ? undefined : 'add-set'"
    class="fixed z-40 grid h-14 w-14 place-items-center rounded-full bg-violet text-ink shadow-lg shadow-violet-muted/30 hover:bg-violet-bright sm:hidden"
    style="right: 1rem; bottom: max(1rem, env(safe-area-inset-bottom))"
    :aria-label="openSet ? 'Add collectible' : 'Add set'"
    @click="onFab"
  >
    <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 5v14M5 12h14" stroke-linecap="round" />
    </svg>
  </button>

  <AddCollectibleOverlay
    v-if="showAddCollectible && openSet"
    :set-name="openSet.name"
    :error="addCollectibleError"
    :saving="savingCollectible"
    :adding-many="addingMany"
    :add-many-progress="addManyProgress"
    @add="onAddCollectible"
    @add-many="onAddMany"
    @zoom="(payload) => (zoomImage = payload)"
    @close="showAddCollectible = false"
  />

  <BulkImportOverlay
    v-if="showImport && openSet && importSource"
    :set-name="openSet.name"
    :source="importSource"
    :importing="importing"
    :progress="importProgress"
    @commit="onImport"
    @close="showImport = false"
  />

  <ConfirmOverlay
    v-if="setPendingDelete"
    title="Delete this set?"
    :message="deleteSetMessage(setPendingDelete)"
    confirm-label="Delete set"
    @confirm="confirmDeleteSet"
    @close="setPendingDelete = null"
  />

  <ConfirmOverlay
    v-if="collectiblePendingDelete"
    title="Remove this collectible?"
    :message="`“${collectiblePendingDelete.name}” will be removed from the set. You can undo this straight afterwards.`"
    confirm-label="Remove"
    @confirm="confirmDeleteCollectible"
    @close="collectiblePendingDelete = null"
  />

  <ImageLightbox v-if="zoomImage" :src="zoomImage.src" :alt="zoomImage.alt" @close="zoomImage = null" />
</template>
