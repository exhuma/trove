<script setup lang="ts">
import { computed, ref } from 'vue'
import AppHeader from './components/AppHeader.vue'
import SetCard from './components/SetCard.vue'
import SetDetail from './components/SetDetail.vue'
import AddSetDialog from './components/AddSetDialog.vue'
import AddCollectibleDialog from './components/AddCollectibleDialog.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import EmptyState from './components/EmptyState.vue'
import FanContentFooter from './components/FanContentFooter.vue'
import ToastHost from './components/ToastHost.vue'
import ImageLightbox from './components/ImageLightbox.vue'
import { useCollection } from './composables/useCollection'
import { useToast } from './composables/useToast'
import type { CollectibleSet } from './types'

const { sets, totals, persistenceBlocked, addSet, removeSet, addCollectible, removeCollectible, setOwnedCount, setTarget } =
  useCollection()
const { push } = useToast()

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

function onAddSet(name: string) {
  const result = addSet(name)
  if (!result.ok) return push(result.message, { tone: 'error' })
  showAddSet.value = false
  push(`Created “${name}”.`)
}

function onAddCollectible(payload: { name: string; image: string }) {
  if (!openSetId.value) return
  const result = addCollectible(openSetId.value, payload)
  if (!result.ok) {
    // Left open with its input intact, so nothing the user typed is lost.
    addCollectibleError.value = result.message
    return
  }
  addCollectibleError.value = ''
  showAddCollectible.value = false
  push(`Added “${payload.name}”.`)
}

function confirmDeleteSet() {
  const target = setPendingDelete.value
  if (!target) return
  const undo = removeSet(target.id)
  setPendingDelete.value = null
  if (openSetId.value === target.id) openSetId.value = null
  if (undo) push(`Deleted “${target.name}”.`, { undo })
}

function confirmDeleteCollectible() {
  const target = collectiblePendingDelete.value
  if (!target) return
  const undo = removeCollectible(target.setId, target.id)
  collectiblePendingDelete.value = null
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
  />

  <!-- Shown only when the browser refused storage. The app still works; this
       just makes sure the user is not surprised by an empty reload. -->
  <div v-if="persistenceBlocked" class="border-b border-amber-muted bg-amber-muted/20 px-6 py-2">
    <p class="mx-auto max-w-6xl text-center text-xs text-amber-bright">
      This browser is blocking local storage, so changes will be lost when you close the page. Everything else works.
    </p>
  </div>

  <main class="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
    <SetDetail
      v-if="openSet"
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

  <AddSetDialog v-if="showAddSet" @add="onAddSet" @close="showAddSet = false" />

  <AddCollectibleDialog
    v-if="showAddCollectible && openSet"
    :set-name="openSet.name"
    :error="addCollectibleError"
    @add="onAddCollectible"
    @zoom="(payload) => (zoomImage = payload)"
    @close="showAddCollectible = false"
  />

  <ConfirmDialog
    v-if="setPendingDelete"
    title="Delete this set?"
    :message="deleteSetMessage(setPendingDelete)"
    confirm-label="Delete set"
    @confirm="confirmDeleteSet"
    @close="setPendingDelete = null"
  />

  <ConfirmDialog
    v-if="collectiblePendingDelete"
    title="Remove this collectible?"
    :message="`“${collectiblePendingDelete.name}” will be removed from the set. You can undo this straight afterwards.`"
    confirm-label="Remove"
    @confirm="confirmDeleteCollectible"
    @close="collectiblePendingDelete = null"
  />

  <ImageLightbox
    v-if="zoomImage"
    :src="zoomImage.src"
    :alt="zoomImage.alt"
    @close="zoomImage = null"
  />

  <ToastHost />
</template>
