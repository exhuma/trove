<script setup lang="ts">
import { useInstallPrompt } from '../composables/useInstallPrompt'

// Two mutually-exclusive paths in one banner shell: a real Install button when
// Chromium has offered installation, or an instructional hint on iOS Safari
// (which can't be prompted programmatically). Both are dismissible; dismissal
// is remembered device-locally. Mirrors UpdateBanner's markup and tokens.
const { showInstallButton, showIOSHint, promptInstall, dismiss } = useInstallPrompt()
</script>

<template>
  <Transition
    enter-active-class="motion-safe:transition motion-safe:duration-200"
    enter-from-class="opacity-0 -translate-y-2"
    leave-active-class="motion-safe:transition motion-safe:duration-150"
    leave-to-class="opacity-0"
  >
    <div
      v-if="showInstallButton || showIOSHint"
      class="fixed inset-x-0 top-0 z-[70] flex justify-center px-4 pt-3"
      style="padding-top: max(0.75rem, env(safe-area-inset-top))"
      role="status"
      aria-live="polite"
    >
      <div class="flex w-full max-w-sm items-center gap-3 rounded-lg border border-violet-muted bg-hall-raised px-4 py-2.5 shadow-xl">
        <span v-if="showInstallButton" class="min-w-0 flex-1 text-sm text-ink">Install Trove for quick access.</span>
        <span v-else class="min-w-0 flex-1 text-sm text-ink">Install Trove: tap Share, then Add to Home Screen.</span>

        <button
          v-if="showInstallButton"
          class="shrink-0 rounded-md bg-violet px-3 py-1 text-sm font-semibold text-ink hover:bg-violet-bright"
          @click="promptInstall"
        >
          Install
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
