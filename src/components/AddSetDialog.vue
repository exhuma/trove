<script setup lang="ts">
import { ref } from 'vue'
import BaseDialog from './BaseDialog.vue'

const emit = defineEmits<{ add: [name: string]; close: [] }>()

const name = ref('')
const error = ref('')

function submit() {
  const trimmed = name.value.trim()
  if (!trimmed) {
    error.value = 'Give the set a name first.'
    return
  }
  emit('add', trimmed)
}
</script>

<template>
  <BaseDialog title="New set" @close="emit('close')">
    <form @submit.prevent="submit">
      <label for="set-name" class="mb-1.5 block text-sm font-medium text-ink">Set name</label>
      <input
        id="set-name"
        v-model="name"
        type="text"
        placeholder="Bloomburrow"
        autocomplete="off"
        class="w-full rounded-lg border border-hall-line bg-hall px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-violet focus:outline-none"
        @input="error = ''"
      />
      <p v-if="error" class="mt-1.5 text-xs text-danger">{{ error }}</p>

      <div class="mt-6 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-medium text-ink-muted hover:bg-hall-panel hover:text-ink"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button type="submit" class="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-ink hover:bg-violet-bright">
          Create set
        </button>
      </div>
    </form>
  </BaseDialog>
</template>
