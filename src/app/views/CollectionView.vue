<script setup lang="ts">
import { computed, ref } from 'vue'
import AppHeader from '../components/AppHeader.vue'
import SetCard from '../components/SetCard.vue'
import SetDetail from '../components/SetDetail.vue'
import AddSetOverlay from '../components/AddSetOverlay.vue'
import AddCollectibleOverlay from '../components/AddCollectibleOverlay.vue'
import ConfirmOverlay from '../components/ConfirmOverlay.vue'
import EmptyState from '../components/EmptyState.vue'
import FanContentFooter from '../components/FanContentFooter.vue'
import ImageLightbox from '../components/ImageLightbox.vue'
import { useCollection } from '@core/composables/useCollection'
import { useToast } from '@core/composables/useToast'
import { useAuth } from '@core/auth'
import type { CollectibleSet } from '@core/types'

const { sets, totals, loading, error, addSet, removeSet, addCollectible, removeCollectible, setOwnedCount, setTarget } =
  useCollection()
const { push } = useToast()
const { signOut } = useAuth()

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

const showAddSet = ref(false)
const showAddCollectible = ref(false)
const addCollectibleError = ref('')

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
    !!setPendingDelete.value ||
    !!collectiblePendingDelete.value ||
    !!zoomImage.value,
)

function onFab() {
  if (openSet.value) {
    addCollectibleError.value = ''
    showAddCollectible.value = true
  } else {
    showAddSet.value = true
  }
}

async function onAddSet(name: string) {
  const result = await addSet(name)
  if (!result.ok) return push(result.message, { tone: 'error' })
  showAddSet.value = false
  push(`Created “${name}”.`)
}

async function onAddCollectible(payload: { name: string; blob: Blob }) {
  if (!openSetId.value) return
  const result = await addCollectible(openSetId.value, payload)
  if (!result.ok) {
    // Left open with its input intact, so nothing the user typed is lost.
    addCollectibleError.value = result.message
    return
  }
  addCollectibleError.value = ''
  showAddCollectible.value = false
  push(`Added “${payload.name}”.`)
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
  <AppHeader
    :sets="totals.sets"
    :owned="totals.owned"
    :wanted="totals.wanted"
    :complete-sets="totals.completeSets"
    @add-set="showAddSet = true"
    @sign-out="signOut"
  />

  <!-- A load or save failed against the backend. -->
  <div v-if="error" class="border-b border-danger/40 bg-danger/10 px-6 py-2">
    <p class="mx-auto max-w-6xl text-center text-xs text-danger">{{ error }}</p>
  </div>

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
          @click="showAddSet = true"
        >
          Create your first set
        </button>
      </EmptyState>

      <ul v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="set in sets" :key="set.id">
          <SetCard :set="set" @open="openSetId = set.id" @remove="setPendingDelete = set" />
        </li>
      </ul>
    </template>
  </main>

  <FanContentFooter />

  <!-- Phone-only floating add button; the header / detail buttons cover `sm` up. -->
  <button
    v-if="!overlayOpen && !(loading && !sets.length)"
    class="fixed z-40 grid h-14 w-14 place-items-center rounded-full bg-violet text-ink shadow-lg shadow-violet-muted/30 hover:bg-violet-bright sm:hidden"
    style="right: 1rem; bottom: max(1rem, env(safe-area-inset-bottom))"
    :aria-label="openSet ? 'Add collectible' : 'Add set'"
    @click="onFab"
  >
    <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 5v14M5 12h14" stroke-linecap="round" />
    </svg>
  </button>

  <AddSetOverlay v-if="showAddSet" @add="onAddSet" @close="showAddSet = false" />

  <AddCollectibleOverlay
    v-if="showAddCollectible && openSet"
    :set-name="openSet.name"
    :error="addCollectibleError"
    @add="onAddCollectible"
    @zoom="(payload) => (zoomImage = payload)"
    @close="showAddCollectible = false"
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
