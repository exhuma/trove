<script setup lang="ts">
import { useInstallPrompt } from '../composables/useInstallPrompt'
import BaseOverlay from './BaseOverlay.vue'

// Platform-specific "how to install" steps for browsers we can't prompt
// programmatically (Firefox, Safari, and Chromium when beforeinstallprompt never
// fired). Opened via useInstallPrompt.install() when there's no native prompt.
// Overlay chrome + a11y come from BaseOverlay/useModalA11y.
const { installGuide, closeGuide } = useInstallPrompt()
</script>

<template>
  <BaseOverlay title="Install Trove" @close="closeGuide">
    <p class="text-sm text-ink-muted">
      Add Trove to your home screen or dock for quick, app-like access — it runs in
      its own window and works offline.
    </p>

    <template v-if="installGuide">
      <h3 class="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-ink-faint">
        {{ installGuide.heading }}
      </h3>
      <ol class="flex flex-col gap-2">
        <li
          v-for="(step, i) in installGuide.steps"
          :key="i"
          class="flex gap-3 rounded-lg border border-hall-line px-3 py-2 text-sm text-ink"
        >
          <span
            class="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-violet-muted text-xs font-semibold tabular-nums text-ink"
          >
            {{ i + 1 }}
          </span>
          <span class="min-w-0 flex-1 leading-snug">{{ step }}</span>
        </li>
      </ol>
    </template>
  </BaseOverlay>
</template>
