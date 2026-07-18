<script setup lang="ts">
// Thumb-sized copies control, shared by the set detail and the needs list.
// Emits an absolute count rather than a delta, matching setOwnedCount() and the
// desktop stepper.
defineProps<{ owned: number; name: string }>()
const emit = defineEmits<{ setOwned: [count: number] }>()
</script>

<template>
  <div class="flex items-center gap-2">
    <button
      class="grid h-11 w-11 place-items-center rounded-lg border border-hall-line text-ink disabled:opacity-30"
      :disabled="owned <= 0"
      :aria-label="`Remove a copy of ${name}`"
      @click="emit('setOwned', owned - 1)"
    >
      −
    </button>
    <span class="w-5 text-center text-base tabular-nums text-ink" aria-live="polite">{{ owned }}</span>
    <button
      class="grid h-11 w-11 place-items-center rounded-lg border border-hall-line text-ink"
      :aria-label="`Add a copy of ${name}`"
      @click="emit('setOwned', owned + 1)"
    >
      +
    </button>
  </div>
</template>
