<script setup lang="ts">
import BaseDialog from './BaseDialog.vue'

defineProps<{ title: string; message: string; confirmLabel: string }>()
const emit = defineEmits<{ confirm: []; close: [] }>()
</script>

<template>
  <BaseDialog :title="title" @close="emit('close')">
    <p class="text-sm leading-relaxed text-ink-muted">{{ message }}</p>
    <div class="mt-6 flex justify-end gap-2">
      <button
        class="rounded-lg px-4 py-2 text-sm font-medium text-ink-muted hover:bg-hall-panel hover:text-ink"
        @click="emit('close')"
      >
        Cancel
      </button>
      <button
        class="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-ink hover:brightness-110"
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </button>
    </div>
  </BaseDialog>
</template>
