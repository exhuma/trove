<script setup lang="ts">
import { computed } from 'vue'
import type { Collectible } from '@core/types'
import OwnedStepper from './OwnedStepper.vue'

const props = defineProps<{ variant: Collectible }>()
const emit = defineEmits<{ setOwned: [count: number]; setTarget: [target: number]; zoom: [] }>()

// Foil is still just a naming convention on import (see mtg-cards/import.ts),
// not a real field — derive the chip from it rather than the name shown, so
// the displayed name stays clean.
const foil = computed(() => props.variant.name.endsWith(' (Foil)'))
const displayName = computed(() => props.variant.name.replace(/ \(Foil\)$/, ''))

function onTargetInput(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  if (Number.isFinite(value)) emit('setTarget', value)
}
</script>

<template>
  <div class="flex items-center gap-4 rounded-lg border border-hall-line bg-hall-raised p-3">
    <button
      class="aspect-card w-11 shrink-0 overflow-hidden rounded border border-hall-line bg-hall-panel"
      :aria-label="`Zoom artwork for ${variant.name}`"
      @click="emit('zoom')"
    >
      <img :src="variant.image" alt="" class="h-full w-full object-contain" />
    </button>

    <div class="min-w-0 flex-1">
      <p class="flex items-center gap-2 truncate text-sm text-ink">
        {{ displayName }}
        <span v-if="foil" class="shrink-0 rounded-full border border-amber-muted px-2 py-0.5 text-[10px] text-amber-bright">
          Foil
        </span>
      </p>
    </div>

    <OwnedStepper
      class="shrink-0"
      :owned="variant.owned"
      :target="variant.target"
      :name="variant.name"
      :complete="variant.owned >= variant.target"
      @set-owned="(count) => emit('setOwned', count)"
    />

    <label class="flex shrink-0 items-center gap-1 text-xs text-ink-faint">
      <span class="sr-only">Copies wanted of {{ variant.name }}</span>
      <span aria-hidden="true">want</span>
      <input
        type="number"
        min="1"
        :value="variant.target"
        :aria-label="`Copies wanted of ${variant.name}`"
        class="h-8 w-12 rounded-md border border-hall-line bg-hall px-1.5 text-center text-xs text-ink tabular-nums focus:border-violet focus:outline-none"
        @change="onTargetInput"
      />
    </label>
  </div>
</template>
