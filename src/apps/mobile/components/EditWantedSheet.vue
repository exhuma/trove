<script setup lang="ts">
import { ref } from 'vue'
import MobileSheet from './MobileSheet.vue'

const props = defineProps<{ name: string; target: number }>()
const emit = defineEmits<{ setTarget: [n: number]; close: [] }>()

// Local mirror so the stepper feels instant; each change is emitted straight
// away. The composable clamps to >= 1 and debounces the write, so live emits
// are safe.
const value = ref(Math.max(1, Math.floor(props.target)))

function change(delta: number) {
  const next = Math.max(1, value.value + delta)
  if (next === value.value) return
  value.value = next
  emit('setTarget', next)
}
</script>

<template>
  <MobileSheet title="How many do you want?" @close="emit('close')">
    <p class="truncate text-sm text-ink-muted">{{ name }}</p>

    <div class="mt-4 flex items-center justify-center gap-6">
      <button
        class="grid h-11 w-11 place-items-center rounded-lg border border-hall-line text-2xl text-ink disabled:opacity-30"
        :disabled="value <= 1"
        aria-label="Decrease wanted count"
        @click="change(-1)"
      >
        −
      </button>
      <span class="w-10 text-center text-3xl tabular-nums text-ink">{{ value }}</span>
      <button
        class="grid h-11 w-11 place-items-center rounded-lg border border-hall-line text-2xl text-ink"
        aria-label="Increase wanted count"
        @click="change(1)"
      >
        +
      </button>
    </div>

    <button
      class="mt-6 min-h-11 w-full rounded-lg bg-violet px-4 py-2 text-sm font-medium text-ink hover:bg-violet-bright"
      @click="emit('close')"
    >
      Done
    </button>
  </MobileSheet>
</template>
