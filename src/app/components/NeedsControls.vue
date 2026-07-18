<script setup lang="ts">
import type { NeedSort } from '@core/composables/useNeeds'

defineProps<{ grouped: boolean; sort: NeedSort }>()
const emit = defineEmits<{ 'update:grouped': [boolean]; 'update:sort': [NeedSort] }>()
</script>

<template>
  <!-- Segmented buttons rather than a native select: only four states, and the
       thumb-sized targets serve touch while reading fine on desktop. Each group
       splits the row on a phone and shrinks to content from `sm` up. -->
  <div class="flex flex-1 flex-wrap items-center gap-2 sm:flex-none sm:gap-3">
    <div
      class="flex flex-1 gap-1 rounded-xl border border-hall-line bg-hall-raised p-1 sm:flex-none sm:rounded-lg"
      role="group"
      aria-label="Grouping"
    >
      <button
        class="min-h-11 flex-1 rounded-lg px-3 text-xs font-medium motion-safe:transition sm:min-h-0 sm:rounded-md sm:py-1"
        :class="grouped ? 'bg-hall-panel text-ink' : 'text-ink-muted hover:text-ink'"
        :aria-pressed="grouped"
        @click="emit('update:grouped', true)"
      >
        By set
      </button>
      <button
        class="min-h-11 flex-1 rounded-lg px-3 text-xs font-medium motion-safe:transition sm:min-h-0 sm:rounded-md sm:py-1"
        :class="!grouped ? 'bg-hall-panel text-ink' : 'text-ink-muted hover:text-ink'"
        :aria-pressed="!grouped"
        @click="emit('update:grouped', false)"
      >
        All
      </button>
    </div>

    <div
      class="flex flex-1 gap-1 rounded-xl border border-hall-line bg-hall-raised p-1 sm:flex-none sm:rounded-lg"
      role="group"
      aria-label="Sort"
    >
      <button
        class="min-h-11 flex-1 rounded-lg px-3 text-xs font-medium motion-safe:transition sm:min-h-0 sm:rounded-md sm:py-1"
        :class="sort === 'name' ? 'bg-hall-panel text-ink' : 'text-ink-muted hover:text-ink'"
        :aria-pressed="sort === 'name'"
        @click="emit('update:sort', 'name')"
      >
        A–Z
      </button>
      <button
        class="min-h-11 flex-1 rounded-lg px-3 text-xs font-medium motion-safe:transition sm:min-h-0 sm:rounded-md sm:py-1"
        :class="sort === 'needed' ? 'bg-hall-panel text-ink' : 'text-ink-muted hover:text-ink'"
        :aria-pressed="sort === 'needed'"
        @click="emit('update:sort', 'needed')"
      >
        Most needed
      </button>
    </div>
  </div>
</template>
