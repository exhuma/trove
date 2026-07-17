<script setup lang="ts">
import { computed } from 'vue'
import type { CollectibleSet } from '../types'
import { progressOf } from '../composables/useCollection'
import ProgressBar from './ProgressBar.vue'

const props = defineProps<{ set: CollectibleSet }>()
const emit = defineEmits<{ open: []; remove: [] }>()

const progress = computed(() => progressOf(props.set))

/** The first few owned cards, fanned out behind the set name. */
const preview = computed(() => props.set.collectibles.slice(0, 4))
</script>

<template>
  <div class="group relative">
    <button
      class="flex w-full flex-col gap-3 rounded-xl border bg-hall-raised p-4 text-left motion-safe:transition"
      :class="
        progress.complete
          ? 'border-amber-muted ring-1 ring-amber-muted/40 hover:border-amber'
          : 'border-hall-line hover:border-violet'
      "
      :aria-label="`Open ${set.name} — ${progress.owned} of ${progress.total} owned`"
      @click="emit('open')"
    >
      <div class="flex items-start gap-3">
        <img v-if="set.symbol" :src="set.symbol" alt="" class="mt-0.5 h-6 w-6 shrink-0 opacity-80 invert" />
        <div v-else class="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-muted">
          <span class="font-display text-xs text-ink">{{ set.name.charAt(0).toUpperCase() }}</span>
        </div>

        <div class="min-w-0 flex-1">
          <h3 class="truncate font-display text-xl leading-tight tracking-wide text-ink">{{ set.name }}</h3>
          <p class="text-xs text-ink-muted">
            <template v-if="progress.total === 0">Nothing added yet</template>
            <template v-else>{{ progress.owned }} of {{ progress.total }} owned</template>
          </p>
        </div>

        <!-- Completion says so in words as well as colour. -->
        <span
          v-if="progress.complete"
          class="flex shrink-0 items-center gap-1 rounded-full bg-amber-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-bright"
        >
          <svg class="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M3 8.5l3.5 3.5L13 4.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Complete
        </span>
      </div>

      <div v-if="preview.length" class="flex gap-1.5">
        <!-- As in CollectibleTile: the card art is never dimmed or greyed, so
             owned vs wanted is carried by the frame and inset alone. -->
        <div
          v-for="card in preview"
          :key="card.id"
          class="aspect-card w-10 overflow-hidden rounded border bg-hall-panel"
          :class="card.owned >= card.target ? 'border-amber-muted' : 'border-dashed border-hall-line'"
        >
          <img
            :src="card.image"
            alt=""
            class="h-full w-full object-contain"
            :class="card.owned >= card.target ? '' : 'p-1'"
          />
        </div>
        <div
          v-if="set.collectibles.length > preview.length"
          class="flex aspect-card w-10 items-center justify-center rounded border border-dashed border-hall-line text-[10px] text-ink-faint"
        >
          +{{ set.collectibles.length - preview.length }}
        </div>
      </div>

      <ProgressBar :owned="progress.owned" :total="progress.total" :complete="progress.complete" />
    </button>

    <button
      class="absolute right-2 top-2 rounded-md p-1.5 text-ink-faint opacity-0 hover:bg-danger hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 motion-safe:transition"
      :aria-label="`Delete set ${set.name}`"
      @click="emit('remove')"
    >
      <svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6">
        <path d="M2.5 4.5h11M6 4.5V3h4v1.5M4 4.5l.7 9h6.6l.7-9" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
  </div>
</template>
