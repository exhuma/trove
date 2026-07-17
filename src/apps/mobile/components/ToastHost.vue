<script setup lang="ts">
import { useToast } from '@core/composables/useToast'

const { toasts, runUndo, dismiss } = useToast()
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-3"
    style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom))"
  >
    <div
      v-for="t in toasts"
      :key="t.id"
      class="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border bg-hall-raised px-3 py-2.5 text-sm text-ink shadow-lg"
      :class="t.tone === 'error' ? 'border-danger/50' : 'border-hall-line'"
    >
      <span class="min-w-0 flex-1">{{ t.message }}</span>
      <button v-if="t.undo" class="shrink-0 font-medium text-violet-bright" @click="runUndo(t)">Undo</button>
      <button class="shrink-0 text-ink-faint" aria-label="Dismiss" @click="dismiss(t.id)">✕</button>
    </div>
  </div>
</template>
