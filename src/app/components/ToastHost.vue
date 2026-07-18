<script setup lang="ts">
import { useToast } from '@core/composables/useToast'

const { toasts, dismiss, runUndo } = useToast()
</script>

<template>
  <!-- aria-live so the outcome of an action reaches screen readers too, not
       just sighted users. The bottom padding clears the phone home indicator via
       the safe-area inset (which resolves to 0 on desktop). -->
  <div
    class="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4"
    style="padding-bottom: max(1rem, env(safe-area-inset-bottom))"
    aria-live="polite"
  >
    <TransitionGroup
      enter-active-class="motion-safe:transition motion-safe:duration-200"
      enter-from-class="opacity-0 translate-y-2"
      leave-active-class="motion-safe:transition motion-safe:duration-150"
      leave-to-class="opacity-0"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border px-4 py-2.5 shadow-xl"
        :class="toast.tone === 'error' ? 'border-danger/50 bg-hall-raised' : 'border-hall-line bg-hall-raised'"
      >
        <span class="min-w-0 flex-1 text-sm text-ink">{{ toast.message }}</span>
        <button
          v-if="toast.undo"
          class="rounded-md px-2 py-1 text-sm font-semibold text-violet-bright hover:bg-violet-muted/40"
          @click="runUndo(toast)"
        >
          Undo
        </button>
        <button
          class="rounded-md p-1 text-ink-faint hover:text-ink"
          aria-label="Dismiss notification"
          @click="dismiss(toast.id)"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
