<script setup lang="ts">
import type { CollectibleGroup } from '@core/collectibleGroups'
import ProgressBar from './ProgressBar.vue'

defineProps<{ group: CollectibleGroup; selected: boolean }>()
const emit = defineEmits<{ select: [] }>()
</script>

<template>
  <button
    type="button"
    class="flex w-full items-center gap-2.5 rounded-lg border-l-2 p-2 text-left motion-safe:transition"
    :class="selected ? 'border-l-violet-bright bg-violet-muted' : 'border-l-transparent hover:bg-hall-panel'"
    @click="emit('select')"
  >
    <span class="aspect-card w-7 shrink-0 overflow-hidden rounded border border-hall-line bg-hall-panel">
      <img :src="group.image" alt="" class="h-full w-full object-contain" />
    </span>
    <span class="min-w-0 flex-1">
      <span class="block truncate text-sm text-ink">{{ group.name }}</span>
      <span v-if="group.variants.length > 1" class="block truncate text-[11px] text-ink-faint">
        {{ group.variants.length }} printings
      </span>
      <ProgressBar class="mt-1 w-10" :owned="Math.min(group.owned, group.target)" :total="group.target" :complete="group.complete" />
    </span>
    <span class="shrink-0 text-xs tabular-nums" :class="group.complete ? 'text-amber-bright' : 'text-ink-muted'">
      {{ group.owned }}/{{ group.target }}
    </span>
  </button>
</template>
