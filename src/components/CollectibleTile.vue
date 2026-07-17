<script setup lang="ts">
import { computed } from 'vue'
import type { Collectible } from '../types'

const props = defineProps<{ collectible: Collectible }>()
const emit = defineEmits<{
  setOwned: [count: number]
  setTarget: [target: number]
  zoom: []
  remove: []
}>()

// Complete once you hold at least as many copies as you want. Extra copies are
// still shown as a raw count, but never push a card past "complete".
const complete = computed(() => props.collectible.owned >= props.collectible.target)

function onTargetInput(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  if (Number.isFinite(value)) emit('setTarget', value)
}
</script>

<template>
  <div class="group relative">
    <div
      class="block w-full overflow-hidden rounded-lg border-2 bg-hall-panel motion-safe:transition"
      :class="
        complete
          ? 'border-amber shadow-lg shadow-amber-muted/30'
          : 'border-dashed border-hall-line'
      "
    >
      <!-- The card image is never altered — not cropped, dimmed, greyed or
           tinted. Scryfall's image rules forbid it, and cropping would clip the
           artist credit and copyright printed along the bottom edge. Complete
           and incomplete are distinguished by the frame around the card
           instead: an inset for incomplete cards, full bleed for complete. -->
      <div class="aspect-card w-full motion-safe:transition-all" :class="complete ? 'p-0' : 'p-2.5'">
        <img :src="collectible.image" alt="" class="h-full w-full object-contain" />
      </div>

      <div
        class="flex items-center gap-2 border-t px-2 py-1.5 motion-safe:transition"
        :class="complete ? 'border-amber-muted bg-amber-muted/30' : 'border-hall-line'"
      >
        <!-- Completion is carried by an icon and the count, not by colour alone. -->
        <svg
          v-if="complete"
          class="h-3.5 w-3.5 shrink-0 text-amber"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path d="M3 8.5l3.5 3.5L13 4.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <svg
          v-else
          class="h-3.5 w-3.5 shrink-0 text-ink-faint"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <circle cx="8" cy="8" r="5.5" stroke-dasharray="2.5 2" />
        </svg>
        <span class="truncate text-left text-xs" :class="complete ? 'text-ink' : 'text-ink-muted'">
          {{ collectible.name }}
        </span>
      </div>

      <!-- Owned/wanted controls. Adjusting copies is the frequent action, so the
           steppers get generous targets (Fitts's law). -->
      <div class="flex items-center gap-2 border-t border-hall-line px-2 py-1.5">
        <div class="flex items-center gap-1">
          <button
            class="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-hall-line text-ink-muted hover:border-violet hover:text-ink disabled:opacity-40 disabled:hover:border-hall-line disabled:hover:text-ink-muted motion-safe:transition"
            :disabled="collectible.owned <= 0"
            :aria-label="`Remove a copy of ${collectible.name}`"
            @click="emit('setOwned', collectible.owned - 1)"
          >
            <svg class="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 8h10" stroke-linecap="round" />
            </svg>
          </button>
          <span
            class="min-w-[3.5rem] text-center text-xs tabular-nums"
            :class="complete ? 'text-ink' : 'text-ink-muted'"
            aria-live="polite"
          >
            {{ collectible.owned }} of {{ collectible.target }} owned
          </span>
          <button
            class="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-hall-line text-ink-muted hover:border-violet hover:text-ink motion-safe:transition"
            :aria-label="`Add a copy of ${collectible.name}`"
            @click="emit('setOwned', collectible.owned + 1)"
          >
            <svg class="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 3v10M3 8h10" stroke-linecap="round" />
            </svg>
          </button>
        </div>

        <label class="ml-auto flex items-center gap-1 text-[10px] text-ink-faint">
          <span class="sr-only">Copies wanted of {{ collectible.name }}</span>
          <span aria-hidden="true">want</span>
          <input
            type="number"
            min="1"
            :value="collectible.target"
            :aria-label="`Copies wanted of ${collectible.name}`"
            class="w-12 rounded-md border border-hall-line bg-hall px-1.5 py-0.5 text-center text-xs text-ink tabular-nums focus:border-violet focus:outline-none"
            @change="onTargetInput"
          />
        </label>
      </div>
    </div>

    <!-- Overlay controls sit outside the card frame's flow so they never nest
         inside another interactive element. -->
    <button
      class="absolute left-1.5 top-1.5 rounded-md bg-hall/80 p-1 text-ink-muted opacity-0 backdrop-blur-sm hover:bg-violet hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 motion-safe:transition"
      :aria-label="`Zoom artwork for ${collectible.name}`"
      @click="emit('zoom')"
    >
      <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
        <circle cx="7" cy="7" r="4.5" />
        <path d="M10.5 10.5L14 14M5 7h4M7 5v4" stroke-linecap="round" />
      </svg>
    </button>

    <button
      class="absolute right-1.5 top-1.5 rounded-md bg-hall/80 p-1 text-ink-muted opacity-0 backdrop-blur-sm hover:bg-danger hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 motion-safe:transition"
      :aria-label="`Remove ${collectible.name}`"
      @click="emit('remove')"
    >
      <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
      </svg>
    </button>
  </div>
</template>
