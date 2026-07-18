<script setup lang="ts">
// Adjusting copies is the frequent action wherever a collectible appears, so the
// same control serves the set grid and the needs list — one set of labels, one
// disabled rule, one live region.
defineProps<{ owned: number; target: number; name: string; complete?: boolean }>()
const emit = defineEmits<{ setOwned: [count: number] }>()
</script>

<template>
  <div class="flex items-center gap-1">
    <button
      class="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-hall-line text-ink-muted hover:border-violet hover:text-ink disabled:opacity-40 disabled:hover:border-hall-line disabled:hover:text-ink-muted motion-safe:transition"
      :disabled="owned <= 0"
      :aria-label="`Remove a copy of ${name}`"
      @click="emit('setOwned', owned - 1)"
    >
      <svg class="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 8h10" stroke-linecap="round" />
      </svg>
    </button>
    <span
      class="min-w-[3.5rem] text-center text-xs tabular-nums"
      :class="complete ? 'text-ink' : 'text-ink-muted'"
      aria-live="polite"
    >
      {{ owned }} of {{ target }} owned
    </span>
    <button
      class="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-hall-line text-ink-muted hover:border-violet hover:text-ink motion-safe:transition"
      :aria-label="`Add a copy of ${name}`"
      @click="emit('setOwned', owned + 1)"
    >
      <svg class="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 3v10M3 8h10" stroke-linecap="round" />
      </svg>
    </button>
  </div>
</template>
