<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import NeedRow from '../components/NeedRow.vue'
import NeedsControls from '../components/NeedsControls.vue'
import EmptyState from '../components/EmptyState.vue'
import FanContentFooter from '../components/FanContentFooter.vue'
import ImageLightbox from '../components/ImageLightbox.vue'
import { useCollection } from '@core/composables/useCollection'
import { useNeeds } from '@core/composables/useNeeds'
import { useToast } from '@core/composables/useToast'
import { useAddSetPrompt } from '../composables/useAddSetPrompt'
import type { NeedRow as Row } from '@core/composables/useNeeds'

const { sets, loading, ready, setOwnedCount } = useCollection()
const { needGroups, needTotals, grouped, sort, captureNeeds } = useNeeds()
const { push } = useToast()
const { openAddSet } = useAddSetPrompt()

// Two triggers, both needed: mount covers arriving from the collection with data
// already loaded, and the ready watch covers a hard refresh straight onto /needs,
// where sets is still empty at mount and a capture then would find nothing.
onMounted(captureNeeds)
watch(ready, (isReady) => {
  if (isReady) captureNeeds()
})

const zoomImage = ref<{ src: string; alt: string } | null>(null)

function onSetOwned(row: Row, count: number) {
  const result = setOwnedCount(row.setId, row.id, count)
  if (!result.ok) push(result.message, { tone: 'error' })
}
</script>

<template>
  <main class="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
    <div v-if="loading && !sets.length" class="flex items-center justify-center gap-2 py-16 text-sm text-ink-muted">
      <svg class="h-4 w-4 motion-safe:animate-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="8" cy="8" r="6" class="opacity-25" />
        <path d="M14 8a6 6 0 00-6-6" stroke-linecap="round" />
      </svg>
      Loading your collection…
    </div>

    <template v-else>
      <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="font-display text-4xl leading-none tracking-wide text-ink">Needs</h2>
          <p class="mt-1 text-sm text-ink-muted">
            {{ needTotals.items }} {{ needTotals.items === 1 ? 'collectible' : 'collectibles' }} still
            wanted · {{ needTotals.copies }} {{ needTotals.copies === 1 ? 'copy' : 'copies' }} to find
          </p>
        </div>

        <div class="flex items-center gap-3">
          <NeedsControls
            v-if="needGroups.length"
            v-model:grouped="grouped"
            v-model:sort="sort"
          />
          <!-- Rows stay put once completed, so the list never shifts mid-tap.
               This is how you clear them out when you're done. -->
          <button
            v-if="needTotals.shown > needTotals.items"
            class="shrink-0 rounded-lg border border-hall-line px-3 py-2 text-sm font-medium text-ink-muted hover:border-violet hover:text-ink motion-safe:transition"
            @click="captureNeeds"
          >
            Clear completed
          </button>
        </div>
      </div>

      <EmptyState
        v-if="!sets.length"
        title="No sets yet"
        hint="Add a set and some collectibles first — anything you don't have enough copies of turns up here."
      >
        <button
          class="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-ink hover:bg-violet-bright"
          @click="openAddSet"
        >
          Create your first set
        </button>
      </EmptyState>

      <EmptyState
        v-else-if="!needGroups.length"
        title="Nothing needed"
        hint="Every collectible you track is at its wanted count. Nice."
      >
        <RouterLink
          to="/"
          class="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-ink hover:bg-violet-bright"
        >
          Back to collection
        </RouterLink>
      </EmptyState>

      <div v-else class="flex flex-col gap-8">
        <section v-for="group in needGroups" :key="group.setId">
          <div v-if="grouped" class="mb-3 flex items-baseline gap-3 border-b border-hall-line pb-2">
            <h3 class="font-display text-xl tracking-wide text-ink">{{ group.setName }}</h3>
            <span class="text-xs tabular-nums text-ink-muted">{{ group.outstanding }} outstanding</span>
          </div>

          <ul class="flex flex-col gap-2">
            <li v-for="row in group.rows" :key="row.id">
              <NeedRow
                :row="row"
                :show-set="!grouped"
                @set-owned="(count) => onSetOwned(row, count)"
                @zoom="zoomImage = { src: row.image, alt: row.name }"
              />
            </li>
          </ul>
        </section>
      </div>
    </template>
  </main>

  <FanContentFooter />

  <ImageLightbox v-if="zoomImage" :src="zoomImage.src" :alt="zoomImage.alt" @close="zoomImage = null" />
</template>
