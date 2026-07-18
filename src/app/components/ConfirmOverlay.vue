<script setup lang="ts">
import BaseOverlay from './BaseOverlay.vue'

defineProps<{ title: string; message: string; confirmLabel: string }>()
const emit = defineEmits<{ confirm: []; close: [] }>()
</script>

<template>
  <BaseOverlay :title="title" @close="emit('close')">
    <p class="text-sm leading-relaxed text-ink-muted">{{ message }}</p>
    <div class="mt-6 flex gap-2 sm:justify-end">
      <button
        class="min-h-11 flex-1 rounded-lg px-4 py-2 text-sm font-medium text-ink-muted hover:bg-hall-panel hover:text-ink sm:flex-none"
        @click="emit('close')"
      >
        Cancel
      </button>
      <button
        class="min-h-11 flex-1 rounded-lg bg-danger px-4 py-2 text-sm font-medium text-ink hover:brightness-110 sm:flex-none"
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </button>
    </div>
  </BaseOverlay>
</template>
