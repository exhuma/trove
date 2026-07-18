<script setup lang="ts">
import { ref } from 'vue'
import BaseOverlay from './BaseOverlay.vue'

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
  <BaseOverlay title="New set" @close="emit('close')">
    <form @submit.prevent="submit">
      <label for="set-name" class="mb-1.5 block text-sm font-medium text-ink">Set name</label>
      <input
        id="set-name"
        v-model="name"
        type="text"
        placeholder="Bloomburrow"
        autocomplete="off"
        class="h-11 w-full rounded-lg border border-hall-line bg-hall px-3 text-base text-ink placeholder:text-ink-faint focus:border-violet focus:outline-none sm:h-auto sm:py-2 sm:text-sm"
        @input="error = ''"
      />
      <p v-if="error" class="mt-1.5 text-xs text-danger">{{ error }}</p>

      <div class="mt-6 flex gap-2 sm:justify-end">
        <button
          type="button"
          class="min-h-11 flex-1 rounded-lg px-4 py-2 text-sm font-medium text-ink-muted hover:bg-hall-panel hover:text-ink sm:flex-none"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="min-h-11 flex-1 rounded-lg bg-violet px-4 py-2 text-sm font-medium text-ink hover:bg-violet-bright sm:flex-none"
        >
          Create set
        </button>
      </div>
    </form>
  </BaseOverlay>
</template>
