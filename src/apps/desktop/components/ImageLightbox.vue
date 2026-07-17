<script setup lang="ts">
import { ref } from 'vue'
import { useModalA11y } from '@core/composables/useModalA11y'

defineProps<{ src: string; alt: string }>()
const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement | null>(null)

// Capture phase so that, when the lightbox is opened on top of another dialog
// (the Scryfall search lives inside one), Escape and Tab close/trap the
// lightbox alone and never reach the dialog underneath.
useModalA11y(panel, () => emit('close'), { capture: true })
</script>

<template>
  <div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-hall/90 backdrop-blur-sm" @click="emit('close')" />
    <div
      ref="panel"
      class="relative flex max-h-full max-w-full flex-col items-center"
      role="dialog"
      aria-modal="true"
      :aria-label="`Artwork: ${alt}`"
    >
      <!-- The art is shown as large as the viewport allows, never cropped, so
           the artist credit along the bottom edge stays legible. -->
      <img :src="src" :alt="alt" class="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl" />
      <button
        class="absolute -right-2 -top-2 grid h-9 w-9 place-items-center rounded-full border border-hall-line bg-hall text-ink-muted hover:border-violet hover:text-ink motion-safe:transition"
        aria-label="Close artwork"
        @click="emit('close')"
      >
        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M5 5l10 10M15 5L5 15" stroke-linecap="round" />
        </svg>
      </button>
    </div>
  </div>
</template>
