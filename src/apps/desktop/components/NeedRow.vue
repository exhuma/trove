<script setup lang="ts">
import type { NeedRow } from '@core/composables/useNeeds'
import OwnedStepper from './OwnedStepper.vue'

defineProps<{
  row: NeedRow
  /** True in flat mode, where the owning set has no group heading to sit under. */
  showSet: boolean
}>()
const emit = defineEmits<{ setOwned: [count: number]; zoom: [] }>()
</script>

<template>
  <div
    class="flex items-center gap-3 rounded-xl border bg-hall-raised p-2.5 motion-safe:transition"
    :class="row.complete ? 'border-amber-muted bg-amber-muted/20' : 'border-hall-line'"
  >
    <!-- Thumbnail only, never cropped or dimmed — the same image rules the set
         grid follows. -->
    <button
      class="aspect-card w-12 shrink-0 overflow-hidden rounded border border-hall-line bg-hall-panel"
      :aria-label="`Zoom artwork for ${row.name}`"
      @click="emit('zoom')"
    >
      <img :src="row.image" alt="" class="h-full w-full object-contain" />
    </button>

    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-medium text-ink">{{ row.name }}</p>
      <p v-if="showSet" class="truncate text-xs text-ink-faint">{{ row.setName }}</p>
    </div>

    <!-- Completion is carried by an icon and wording, not by colour alone. -->
    <p v-if="row.complete" class="flex shrink-0 items-center gap-1.5 text-xs text-amber-bright">
      <svg
        class="h-3.5 w-3.5 shrink-0 text-amber"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <path d="M3 8.5l3.5 3.5L13 4.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      Complete
    </p>
    <p v-else class="shrink-0 text-xs tabular-nums text-ink-muted">
      need {{ row.needed }} more
    </p>

    <OwnedStepper
      :owned="row.owned"
      :target="row.target"
      :name="row.name"
      :complete="row.complete"
      @set-owned="(count) => emit('setOwned', count)"
    />
  </div>
</template>
