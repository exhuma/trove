<script setup lang="ts">
import { ref } from 'vue'
import { useModalA11y } from '@core/composables/useModalA11y'

defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement | null>(null)

// Escape-to-close, Tab focus trap and focus restore all live in the shared
// composable, so this component is just the panel chrome.
useModalA11y(panel, () => emit('close'))
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-hall/80 backdrop-blur-sm" @click="emit('close')" />
    <div
      ref="panel"
      class="relative w-full max-w-lg rounded-xl border border-hall-line bg-hall-raised shadow-2xl shadow-violet-muted/20"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
    >
      <header class="flex items-center justify-between border-b border-hall-line px-5 py-4">
        <h2 class="font-display text-2xl tracking-wide text-ink">{{ title }}</h2>
        <button
          class="rounded-md p-1 text-ink-muted hover:bg-hall-panel hover:text-ink"
          aria-label="Close dialog"
          @click="emit('close')"
        >
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M5 5l10 10M15 5L5 15" stroke-linecap="round" />
          </svg>
        </button>
      </header>
      <div class="px-5 py-5">
        <slot />
      </div>
    </div>
  </div>
</template>
