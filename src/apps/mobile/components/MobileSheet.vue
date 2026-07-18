<script setup lang="ts">
import { ref } from 'vue'
import { useModalA11y } from '@core/composables/useModalA11y'

defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement | null>(null)

// Escape-to-close, Tab focus trap and focus restore all live in the shared
// composable, so this component is just the sheet chrome. The touch analogue of
// the desktop BaseDialog: it slides up from the bottom instead of centering.
useModalA11y(panel, () => emit('close'))
</script>

<template>
  <div class="fixed inset-0 z-50 flex flex-col justify-end">
    <div class="absolute inset-0 bg-hall/80 backdrop-blur-sm" @click="emit('close')" />
    <Transition
      appear
      enter-active-class="motion-safe:transition motion-safe:duration-200 motion-safe:ease-out"
      enter-from-class="translate-y-full"
      enter-to-class="translate-y-0"
    >
      <div
        ref="panel"
        class="relative max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border-t border-hall-line bg-hall-raised shadow-2xl shadow-violet-muted/20"
        style="padding-bottom: max(1rem, env(safe-area-inset-bottom))"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <!-- Grab handle: a slide-up affordance, not interactive. -->
        <div class="mx-auto mt-2 h-1 w-10 rounded-full bg-hall-line" aria-hidden="true" />

        <header class="flex items-center justify-between px-5 pb-1 pt-2">
          <h2 class="font-display text-xl tracking-wide text-ink">{{ title }}</h2>
          <button
            class="-mr-2 grid h-11 w-11 place-items-center rounded-md text-ink-muted hover:bg-hall-panel hover:text-ink"
            aria-label="Close"
            @click="emit('close')"
          >
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M5 5l10 10M15 5L5 15" stroke-linecap="round" />
            </svg>
          </button>
        </header>

        <div class="px-5 pb-5 pt-3">
          <slot />
        </div>
      </div>
    </Transition>
  </div>
</template>
