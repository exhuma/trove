<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCollection, progressOf } from '@core/composables/useCollection'
import { useNeeds } from '@core/composables/useNeeds'
import { useToast } from '@core/composables/useToast'
import { useAuth } from '@core/auth'
import type { CollectibleSet } from '@core/types'
import TroveWordmark from '@core/components/TroveWordmark.vue'
import AddSetSheet from '../components/AddSetSheet.vue'
import AddCollectibleSheet from '../components/AddCollectibleSheet.vue'
import ConfirmSheet from '../components/ConfirmSheet.vue'
import EditWantedSheet from '../components/EditWantedSheet.vue'
import OwnedStepper from '../components/OwnedStepper.vue'
import NavSwitcher from '../components/NavSwitcher.vue'

// The mobile "pocket" build now authors as well as browses: create and delete
// sets and collectibles, adjust owned counts, and edit the wanted target — all
// on the go. Every mutation lives in the shared composable.
const { sets, loading, error, addSet, removeSet, addCollectible, removeCollectible, setOwnedCount, setTarget } =
  useCollection()
const { push } = useToast()
const { signOut } = useAuth()
const { needingCount } = useNeeds()

const openSetId = ref<string | null>(null)
const openSet = computed(() => sets.value.find((s) => s.id === openSetId.value) ?? null)

const zoom = ref<{ src: string; alt: string } | null>(null)

// One sheet at a time; each maps to a desktop dialog.
const showAddSet = ref(false)
const showAddCollectible = ref(false)
const addCollectibleError = ref('')
const setPendingDelete = ref<CollectibleSet | null>(null)
const collectiblePendingDelete = ref<{ setId: string; id: string; name: string } | null>(null)
const editWanted = ref<{ id: string; name: string; target: number } | null>(null)

// Any sheet or the zoom overlay being open hides the FAB, so it never sits over
// a form.
const overlayOpen = computed(
  () =>
    showAddSet.value ||
    showAddCollectible.value ||
    !!setPendingDelete.value ||
    !!collectiblePendingDelete.value ||
    !!editWanted.value ||
    !!zoom.value,
)

function onSetOwned(collectibleId: string, count: number) {
  if (!openSetId.value) return
  const result = setOwnedCount(openSetId.value, collectibleId, count)
  if (!result.ok) push(result.message, { tone: 'error' })
}

function onSetTarget(collectibleId: string, target: number) {
  if (!openSetId.value) return
  const result = setTarget(openSetId.value, collectibleId, target)
  if (!result.ok) push(result.message, { tone: 'error' })
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
  <div class="flex min-h-screen flex-col">
    <header
      class="sticky top-0 z-30 flex items-center gap-3 border-b border-hall-line bg-hall/90 px-4 py-3 backdrop-blur-md"
      style="padding-top: max(0.75rem, env(safe-area-inset-top))"
    >
      <button
        v-if="openSet"
        class="-ml-1 flex items-center gap-1 text-sm text-ink-muted"
        @click="openSetId = null"
      >
        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M12 5l-5 5 5 5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        Sets
      </button>
      <h1 v-else>
        <TroveWordmark size="sm" />
      </h1>

      <span class="min-w-0 flex-1 truncate text-center font-display text-lg tracking-wide text-ink">
        {{ openSet?.name ?? '' }}
      </span>

      <button class="shrink-0 text-sm text-ink-muted" @click="signOut">Sign out</button>
    </header>

    <div v-if="error" class="border-b border-danger/40 bg-danger/10 px-4 py-2 text-center text-xs text-danger">
      {{ error }}
    </div>

    <!-- Only at the top level: inside a set the header is already a back/title
         bar, and a second row of navigation would compete with it. -->
    <NavSwitcher v-if="!openSet" :needing="needingCount" />

    <main class="flex-1 px-4 py-4">
      <div v-if="loading && !sets.length" class="py-16 text-center text-sm text-ink-muted">Loading…</div>

      <!-- Set detail: adjust owned counts, edit the target, add and remove -->
      <ul v-else-if="openSet" class="flex flex-col gap-2">
        <li v-if="!openSet.collectibles.length" class="py-16 text-center text-sm text-ink-faint">
          Nothing in this set yet. Tap ＋ to add one.
        </li>
        <li
          v-for="c in openSet.collectibles"
          :key="c.id"
          class="flex items-center gap-3 rounded-xl border border-hall-line bg-hall-raised p-2"
        >
          <button
            class="aspect-card w-12 shrink-0 overflow-hidden rounded border border-hall-line bg-hall-panel"
            @click="zoom = { src: c.image, alt: c.name }"
          >
            <img :src="c.image" alt="" class="h-full w-full object-contain" />
          </button>

          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-ink">{{ c.name }}</p>
            <div class="mt-1 flex items-center gap-2">
              <OwnedStepper
                :owned="c.owned"
                :name="c.name"
                @set-owned="(count) => onSetOwned(c.id, count)"
              />
              <button
                class="ml-1 inline-flex min-h-11 items-center gap-1 rounded-lg border border-hall-line px-2.5 text-xs"
                :class="c.owned >= c.target ? 'text-amber-bright' : 'text-ink-muted'"
                :aria-label="`Edit wanted count, currently ${c.target}`"
                @click="editWanted = { id: c.id, name: c.name, target: c.target }"
              >
                <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6">
                  <path d="M11 2l3 3-7.5 7.5L3 13l0.5-3.5L11 2z" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                want {{ c.target }}
              </button>
            </div>
          </div>

          <button
            class="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-faint active:text-danger"
            :aria-label="`Delete ${c.name}`"
            @click="collectiblePendingDelete = { setId: openSet.id, id: c.id, name: c.name }"
          >
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
              <path d="M4 6h12M8 6V4h4v2M6 6l0.5 10h7L14 6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </li>
      </ul>

      <!-- Set list -->
      <template v-else>
        <p v-if="!sets.length" class="py-16 text-center text-sm text-ink-faint">
          No sets yet. Tap ＋ to create one.
        </p>
        <ul v-else class="flex flex-col gap-2">
          <li
            v-for="set in sets"
            :key="set.id"
            class="flex items-center gap-2 rounded-xl border border-hall-line bg-hall-raised"
          >
            <button class="flex min-w-0 flex-1 items-center gap-3 p-3 text-left" @click="openSetId = set.id">
              <div class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-muted">
                <span class="font-display text-sm text-ink">{{ set.name.charAt(0).toUpperCase() }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate font-display text-lg leading-tight tracking-wide text-ink">{{ set.name }}</p>
                <p class="text-xs text-ink-muted">
                  {{ progressOf(set).owned }} of {{ progressOf(set).total }} owned
                </p>
              </div>
              <svg class="h-5 w-5 shrink-0 text-ink-faint" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M8 5l5 5-5 5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <button
              class="mr-1 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-faint active:text-danger"
              :aria-label="`Delete ${set.name}`"
              @click="setPendingDelete = set"
            >
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
                <path d="M4 6h12M8 6V4h4v2M6 6l0.5 10h7L14 6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </li>
        </ul>
      </template>
    </main>

    <!-- Contextual add: a set on the list, a collectible inside a set. -->
    <button
      v-if="!overlayOpen && !(loading && !sets.length)"
      class="fixed z-40 grid h-14 w-14 place-items-center rounded-full bg-violet text-ink shadow-lg shadow-violet-muted/30 hover:bg-violet-bright"
      style="right: 1rem; bottom: max(1rem, env(safe-area-inset-bottom))"
      :aria-label="openSet ? 'Add collectible' : 'Add set'"
      @click="openSet ? ((addCollectibleError = ''), (showAddCollectible = true)) : (showAddSet = true)"
    >
      <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14" stroke-linecap="round" />
      </svg>
    </button>

    <!-- Sheets -->
    <AddSetSheet v-if="showAddSet" @add="onAddSet" @close="showAddSet = false" />

    <AddCollectibleSheet
      v-if="showAddCollectible && openSet"
      :set-name="openSet.name"
      :error="addCollectibleError"
      @add="onAddCollectible"
      @zoom="(payload) => (zoom = payload)"
      @close="showAddCollectible = false"
    />

    <ConfirmSheet
      v-if="setPendingDelete"
      title="Delete this set?"
      :message="deleteSetMessage(setPendingDelete)"
      confirm-label="Delete set"
      @confirm="confirmDeleteSet"
      @close="setPendingDelete = null"
    />

    <ConfirmSheet
      v-if="collectiblePendingDelete"
      title="Remove this collectible?"
      :message="`“${collectiblePendingDelete.name}” will be removed from the set. You can undo this straight afterwards.`"
      confirm-label="Remove"
      @confirm="confirmDeleteCollectible"
      @close="collectiblePendingDelete = null"
    />

    <EditWantedSheet
      v-if="editWanted"
      :name="editWanted.name"
      :target="editWanted.target"
      @set-target="(n) => onSetTarget(editWanted!.id, n)"
      @close="editWanted = null"
    />

    <!-- Full-screen image view. Raised above sheets so a Scryfall zoom opened
         from the add sheet stacks on top. -->
    <div
      v-if="zoom"
      class="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-6"
      @click="zoom = null"
    >
      <img :src="zoom.src" :alt="zoom.alt" class="max-h-[85vh] max-w-full rounded-lg object-contain" />
    </div>
  </div>
</template>
