<script setup lang="ts">
import { computed, ref } from 'vue'
import ManageListRow from '../components/ManageListRow.vue'
import ManageDetailPanel from '../components/ManageDetailPanel.vue'
import AddCollectibleOverlay from '../components/AddCollectibleOverlay.vue'
import EmptyState from '../components/EmptyState.vue'
import ImageLightbox from '../components/ImageLightbox.vue'
import { useCollection } from '@core/composables/useCollection'
import { useManagement } from '@core/composables/useManagement'
import { useToast } from '@core/composables/useToast'
import type { CatalogResult, CatalogSource } from '@core/catalog'

const { loading, sets, setOwnedCount, setTarget, setNotes, addCollectible } = useCollection()
const { groupedSets, selectedGroup, searchQuery, select } = useManagement()
const { push } = useToast()

// Selecting nothing shows an empty prompt rather than the first group, so a
// search that matches nothing doesn't leave a stale, unrelated item selected.
const selectedSetId = computed(() => selectedGroup.value?.set.id ?? null)

function onSetOwned(variantId: string, count: number) {
  if (!selectedSetId.value) return
  const result = setOwnedCount(selectedSetId.value, variantId, count)
  if (!result.ok) push(result.message, { tone: 'error' })
}

function onSetTarget(variantId: string, target: number) {
  if (!selectedSetId.value) return
  const result = setTarget(selectedSetId.value, variantId, target)
  if (!result.ok) push(result.message, { tone: 'error' })
}

function onSetNotes(notes: string) {
  const variantId = selectedGroup.value?.group.variants[0]?.id
  if (!selectedSetId.value || !variantId) return
  const result = setNotes(selectedSetId.value, variantId, notes)
  if (!result.ok) push(result.message, { tone: 'error' })
}

const zoomImage = ref<{ src: string; alt: string } | null>(null)

// "Add another printing" reuses the same catalogue overlay CollectionView uses
// for adding to a set, scoped to whichever set the selected card belongs to.
const showAddCollectible = ref(false)
const addCollectibleError = ref('')
const addingMany = ref(false)
const addManyProgress = ref({ done: 0, total: 0 })
const addTargetSetName = computed(
  () => sets.value.find((s) => s.id === selectedSetId.value)?.name ?? '',
)

async function onAddMany(payload: { source: CatalogSource; items: { result: CatalogResult; name: string }[] }) {
  if (!selectedSetId.value || addingMany.value) return
  addingMany.value = true
  addManyProgress.value = { done: 0, total: payload.items.length }
  const signal = new AbortController().signal
  let added = 0
  let failed = 0
  try {
    for (const item of payload.items) {
      try {
        const blob = await payload.source.fetchImage(item.result, signal)
        const result = await addCollectible(selectedSetId.value, {
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
  const summary = `Added ${added} ${added === 1 ? 'printing' : 'printings'}.`
  push(failed ? `${summary} ${failed} couldn’t be added.` : summary, failed ? { tone: 'error' } : undefined)
}

async function onAdd(payload: { name: string; blob: Blob }) {
  if (!selectedSetId.value) return
  const result = await addCollectible(selectedSetId.value, payload)
  if (!result.ok) {
    addCollectibleError.value = result.message
    return
  }
  addCollectibleError.value = ''
  showAddCollectible.value = false
  push(`Added “${payload.name}”.`)
}
</script>

<template>
  <main class="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
    <div class="mb-4 sm:hidden">
      <EmptyState title="Best on a larger screen" hint="Manage is built for mouse and keyboard — try it from a desktop." />
    </div>

    <div v-if="loading && !sets.length" class="flex items-center justify-center gap-2 py-16 text-sm text-ink-muted">
      <svg class="h-4 w-4 motion-safe:animate-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="8" cy="8" r="6" class="opacity-25" />
        <path d="M14 8a6 6 0 00-6-6" stroke-linecap="round" />
      </svg>
      Loading your collection…
    </div>

    <EmptyState
      v-else-if="!sets.length"
      title="No sets yet"
      hint="Add a set and some collectibles from the Collection view first — they'll show up here for management."
    />

    <div v-else class="flex min-h-0 flex-1 gap-6">
      <div class="flex w-80 shrink-0 flex-col rounded-xl border border-hall-line bg-hall-raised">
        <div class="p-3">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search collectibles…"
            class="w-full rounded-lg border border-hall-line bg-hall px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-violet focus:outline-none"
          />
        </div>
        <div class="flex-1 overflow-y-auto px-2 pb-3">
          <template v-for="{ set, groups } in groupedSets" :key="set.id">
            <p class="px-2 pb-1.5 pt-3 font-display text-sm tracking-wide text-ink-faint">{{ set.name }}</p>
            <ManageListRow
              v-for="group in groups"
              :key="group.key"
              :group="group"
              :selected="selectedSetId === set.id && selectedGroup?.group.key === group.key"
              @select="select(group.variants[0].id)"
            />
          </template>
        </div>
      </div>

      <div class="flex min-h-0 flex-1 rounded-xl border border-hall-line bg-hall-raised">
        <ManageDetailPanel
          v-if="selectedGroup"
          :group="selectedGroup.group"
          :set-name="selectedGroup.set.name"
          @set-owned="onSetOwned"
          @set-target="onSetTarget"
          @set-notes="onSetNotes"
          @zoom="zoomImage = $event"
          @add-printing="showAddCollectible = true"
        />
        <div v-else class="flex flex-1 items-center justify-center p-10 text-center text-sm text-ink-faint">
          Pick a collectible on the left to see its printings and edit counts.
        </div>
      </div>
    </div>
  </main>

  <AddCollectibleOverlay
    v-if="showAddCollectible"
    :set-name="addTargetSetName"
    :error="addCollectibleError"
    :adding-many="addingMany"
    :add-many-progress="addManyProgress"
    @add="onAdd"
    @add-many="onAddMany"
    @zoom="zoomImage = $event"
    @close="showAddCollectible = false"
  />

  <ImageLightbox v-if="zoomImage" :src="zoomImage.src" :alt="zoomImage.alt" @close="zoomImage = null" />
</template>
