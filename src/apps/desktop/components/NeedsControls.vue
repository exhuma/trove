<script setup lang="ts">
import type { NeedSort } from '@core/composables/useNeeds'

defineProps<{ grouped: boolean; sort: NeedSort }>()
const emit = defineEmits<{ 'update:grouped': [boolean]; 'update:sort': [NeedSort] }>()

function onSort(event: Event) {
  emit('update:sort', (event.target as HTMLSelectElement).value as NeedSort)
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <div
      class="flex items-center gap-1 rounded-lg border border-hall-line bg-hall-raised p-1"
      role="group"
      aria-label="Grouping"
    >
      <button
        class="rounded-md px-3 py-1 text-xs font-medium motion-safe:transition"
        :class="grouped ? 'bg-hall-panel text-ink' : 'text-ink-muted hover:text-ink'"
        :aria-pressed="grouped"
        @click="emit('update:grouped', true)"
      >
        By set
      </button>
      <button
        class="rounded-md px-3 py-1 text-xs font-medium motion-safe:transition"
        :class="!grouped ? 'bg-hall-panel text-ink' : 'text-ink-muted hover:text-ink'"
        :aria-pressed="!grouped"
        @click="emit('update:grouped', false)"
      >
        All
      </button>
    </div>

    <!-- A native select: one control, keyboard- and screen-reader-correct with no
         custom listbox to build or maintain. -->
    <label class="flex items-center gap-2 text-xs text-ink-faint">
      <span class="sr-only">Sort collectibles by</span>
      <span aria-hidden="true">Sort</span>
      <select
        :value="sort"
        class="rounded-lg border border-hall-line bg-hall px-2 py-1.5 text-sm text-ink focus:border-violet focus:outline-none"
        @change="onSort"
      >
        <option value="name">Name (A–Z)</option>
        <option value="needed">Most needed</option>
      </select>
    </label>
  </div>
</template>
