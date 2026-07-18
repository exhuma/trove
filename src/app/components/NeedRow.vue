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
    class="flex items-center gap-3 rounded-xl border bg-hall-raised p-2 motion-safe:transition sm:p-2.5"
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

      <!-- Completion is carried by an icon and wording, not by colour alone. The
           set name rides along in flat mode, where there is no group heading. -->
      <p class="flex items-center gap-1 truncate text-xs" :class="row.complete ? 'text-amber-bright' : 'text-ink-muted'">
        <svg
          v-if="row.complete"
          class="h-3.5 w-3.5 shrink-0 text-amber"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path d="M3 8.5l3.5 3.5L13 4.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="truncate">
          {{ row.complete ? 'Complete' : `need ${row.needed} more` }}
          <span v-if="showSet" class="text-ink-faint">· {{ row.setName }}</span>
        </span>
      </p>
    </div>

    <OwnedStepper
      class="shrink-0"
      :owned="row.owned"
      :target="row.target"
      :name="row.name"
      :complete="row.complete"
      @set-owned="(count) => emit('setOwned', count)"
    />
  </div>
</template>
