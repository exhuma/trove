<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'

// Registers the service worker and, with registerType: 'prompt', flips needRefresh
// when a newer build is waiting. The check rides on the browser's normal SW update
// (on navigation) — no polling. Until the user acts, the current version keeps
// running, so an update never interrupts them mid-task. Inert in dev (PWA disabled).
const { needRefresh, updateServiceWorker } = useRegisterSW()

function refresh() {
  // Activates the waiting worker and reloads the page onto the new build.
  void updateServiceWorker()
}

function dismiss() {
  needRefresh.value = false
}
</script>

<template>
  <Transition
    enter-active-class="motion-safe:transition motion-safe:duration-200"
    enter-from-class="opacity-0 -translate-y-2"
    leave-active-class="motion-safe:transition motion-safe:duration-150"
    leave-to-class="opacity-0"
  >
    <div
      v-if="needRefresh"
      class="fixed inset-x-0 top-0 z-[70] flex justify-center px-4 pt-3"
      style="padding-top: max(0.75rem, env(safe-area-inset-top))"
      role="status"
      aria-live="polite"
    >
      <div class="flex w-full max-w-sm items-center gap-3 rounded-lg border border-violet-muted bg-hall-raised px-4 py-2.5 shadow-xl">
        <span class="min-w-0 flex-1 text-sm text-ink">A new version of Trove is available.</span>
        <button
          class="shrink-0 rounded-md bg-violet px-3 py-1 text-sm font-semibold text-ink hover:bg-violet-bright"
          @click="refresh"
        >
          Refresh
        </button>
        <button
          class="shrink-0 rounded-md p-1 text-ink-faint hover:text-ink"
          aria-label="Dismiss"
          @click="dismiss"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>
  </Transition>
</template>
