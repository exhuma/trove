<script setup lang="ts">
import { computed } from 'vue'
import type { CollectibleSet } from '../types'
import { progressOf } from '../composables/useCollection'
import CollectibleTile from './CollectibleTile.vue'
import ProgressBar from './ProgressBar.vue'
import EmptyState from './EmptyState.vue'

const props = defineProps<{ set: CollectibleSet }>()
const emit = defineEmits<{
  back: []
  add: []
  setOwned: [id: string, count: number]
  setTarget: [id: string, target: number]
  zoom: [id: string]
  remove: [id: string]
}>()

const progress = computed(() => progressOf(props.set))
</script>

<template>
  <div>
    <button
      class="mb-5 flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      @click="emit('back')"
    >
      <svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M10 3L5 8l5 5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      All sets
    </button>

    <div class="mb-6 flex flex-wrap items-center gap-4">
      <img v-if="set.symbol" :src="set.symbol" alt="" class="h-9 w-9 shrink-0 opacity-80 invert" />
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-3">
          <h2 class="font-display text-4xl leading-none tracking-wide text-ink">{{ set.name }}</h2>
          <span
            v-if="progress.complete"
            class="flex items-center gap-1 rounded-full bg-amber-muted/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-bright"
          >
            <svg class="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M3 8.5l3.5 3.5L13 4.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            Complete
          </span>
        </div>
        <p class="mt-1 text-sm text-ink-muted">
          <template v-if="progress.total === 0">Nothing added yet</template>
          <template v-else-if="progress.complete">All {{ progress.total }} owned</template>
          <template v-else>
            {{ progress.owned }} of {{ progress.total }} owned · {{ progress.total - progress.owned }} still wanted
          </template>
        </p>
      </div>

      <button
        class="flex shrink-0 items-center gap-2 rounded-lg border border-hall-line px-3 py-2 text-sm text-ink hover:border-violet"
        @click="emit('add')"
      >
        <svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 3v10M3 8h10" stroke-linecap="round" />
        </svg>
        Add collectible
      </button>
    </div>

    <ProgressBar
      class="mb-8"
      :owned="progress.owned"
      :total="progress.total"
      :complete="progress.complete"
    />

    <EmptyState
      v-if="!set.collectibles.length"
      title="No collectibles yet"
      hint="Add one from a picture on your device, or search Scryfall for a card."
    >
      <button
        class="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-ink hover:bg-violet-bright"
        @click="emit('add')"
      >
        Add the first one
      </button>
    </EmptyState>

    <ul v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <li v-for="collectible in set.collectibles" :key="collectible.id">
        <CollectibleTile
          :collectible="collectible"
          @set-owned="(count) => emit('setOwned', collectible.id, count)"
          @set-target="(target) => emit('setTarget', collectible.id, target)"
          @zoom="emit('zoom', collectible.id)"
          @remove="emit('remove', collectible.id)"
        />
      </li>
    </ul>

    <p v-if="set.collectibles.length" class="mt-6 text-center text-xs text-ink-faint">
      Use + and − to track how many copies you own.
    </p>
  </div>
</template>
