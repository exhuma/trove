<script setup lang="ts">
import { ref } from 'vue'
import { useModalA11y } from '@core/composables/useModalA11y'

defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement | null>(null)

// Escape-to-close, Tab focus trap and focus restore all live in the shared
// composable, so this component is just the panel chrome. One responsive shell
// for both form factors: it docks to the bottom as a slide-up sheet on phones
// and centres as a dialog from `sm` up. The switch is pure CSS — the panel never
// unmounts on resize, so the focus trap stays put mid-interaction.
useModalA11y(panel, () => emit('close'))
</script>

<template>
  <div class="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
    <div class="absolute inset-0 bg-hall/80 backdrop-blur-sm" @click="emit('close')" />
    <Transition
      appear
      enter-active-class="motion-safe:transition motion-safe:duration-200 motion-safe:ease-out"
      enter-from-class="translate-y-full sm:translate-y-0 sm:scale-95 sm:opacity-0"
      enter-to-class="translate-y-0 sm:scale-100 sm:opacity-100"
    >
      <div
        ref="panel"
        class="relative max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border-t border-hall-line bg-hall-raised shadow-2xl shadow-violet-muted/20 sm:max-w-lg sm:rounded-xl sm:border"
        style="padding-bottom: max(1rem, env(safe-area-inset-bottom))"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <!-- Grab handle: a slide-up affordance for touch, hidden on the desktop
             dialog which never slides. -->
        <div class="mx-auto mt-2 h-1 w-10 rounded-full bg-hall-line sm:hidden" aria-hidden="true" />

        <header class="flex items-center justify-between px-5 pb-1 pt-2 sm:border-b sm:border-hall-line sm:pb-4 sm:pt-4">
          <h2 class="font-display text-xl tracking-wide text-ink sm:text-2xl">{{ title }}</h2>
          <button
            class="-mr-2 grid h-11 w-11 place-items-center rounded-md text-ink-muted hover:bg-hall-panel hover:text-ink sm:mr-0 sm:h-auto sm:w-auto sm:p-1"
            aria-label="Close"
            @click="emit('close')"
          >
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M5 5l10 10M15 5L5 15" stroke-linecap="round" />
            </svg>
          </button>
        </header>

        <div class="px-5 pb-5 pt-3 sm:py-5">
          <slot />
        </div>
      </div>
    </Transition>
  </div>
</template>
