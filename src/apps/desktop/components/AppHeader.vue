<script setup lang="ts">
import TroveWordmark from '@core/components/TroveWordmark.vue'

defineProps<{ sets: number; owned: number; wanted: number; completeSets: number }>()
const emit = defineEmits<{ addSet: []; signOut: [] }>()
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-hall-line bg-hall/85 backdrop-blur-md">
    <div class="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
      <div class="min-w-0 flex-1">
        <!-- The banner wordmark: bold, uppercase, letterspaced, echoing the
             convention-hall signage the theme is drawn from. -->
        <h1>
          <TroveWordmark size="md" />
        </h1>
        <p class="mt-1 truncate text-xs text-ink-muted">
          {{ sets }} {{ sets === 1 ? 'set' : 'sets' }} · {{ owned }} owned · {{ wanted }} wanted
          <span v-if="completeSets" class="text-amber">· {{ completeSets }} complete</span>
        </p>
      </div>

      <button
        class="flex shrink-0 items-center gap-2 rounded-lg bg-violet px-4 py-2 text-sm font-medium text-ink hover:bg-violet-bright motion-safe:transition"
        @click="emit('addSet')"
      >
        <svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 3v10M3 8h10" stroke-linecap="round" />
        </svg>
        New set
      </button>

      <button
        class="shrink-0 rounded-lg border border-hall-line px-3 py-2 text-sm font-medium text-ink-muted hover:border-violet hover:text-ink motion-safe:transition"
        @click="emit('signOut')"
      >
        Sign out
      </button>
    </div>
  </header>
</template>
