<script setup lang="ts">
import { computed } from 'vue'
import type { CollectibleGroup } from '@core/collectibleGroups'
import CompletionRing from './CompletionRing.vue'
import VariantRow from './VariantRow.vue'

const props = defineProps<{ group: CollectibleGroup; setName: string }>()
const emit = defineEmits<{
  setOwned: [variantId: string, count: number]
  setTarget: [variantId: string, target: number]
  setNotes: [notes: string]
  zoom: [payload: { src: string; alt: string }]
  addPrinting: []
}>()

// Notes are a field on each Collectible row, not on the (purely computed)
// group — the dossier surfaces the group's representative variant's note as
// "the card's note", same as it already borrows that variant's name/image.
const primary = computed(() => props.group.variants[0])

function onNotesInput(event: Event) {
  emit('setNotes', (event.target as HTMLTextAreaElement).value)
}

const addedLabel = computed(() =>
  new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(new Date(primary.value.addedAt)),
)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-6 py-7 sm:px-10">
    <div class="mb-2 flex items-start gap-5">
      <button
        class="aspect-card w-24 shrink-0 overflow-hidden rounded-lg border-2 border-violet-bright bg-hall-panel"
        :aria-label="`Zoom artwork for ${group.name}`"
        @click="emit('zoom', { src: group.image, alt: group.name })"
      >
        <img :src="group.image" alt="" class="h-full w-full object-contain" />
      </button>

      <div class="min-w-0 flex-1">
        <h2 class="truncate font-display text-3xl leading-none tracking-wide text-ink">{{ group.name }}</h2>
        <p class="mt-1 truncate text-sm text-ink-faint">{{ setName }}</p>

        <div class="mt-3 flex flex-wrap gap-2">
          <span class="rounded-full border border-hall-line px-2.5 py-1 text-[11px] text-ink-muted">
            {{ group.variants.length }} {{ group.variants.length === 1 ? 'printing' : 'printings' }} owned
          </span>
          <span class="rounded-full border border-hall-line px-2.5 py-1 text-[11px] text-ink-muted">
            Added {{ addedLabel }}
          </span>
        </div>

        <div class="mt-4 flex items-center gap-3">
          <CompletionRing :owned="group.owned" :target="group.target" :complete="group.complete" />
          <div class="text-sm text-ink-muted">
            <span class="font-medium text-ink">{{ group.owned }} of {{ group.target }}</span> owned across all
            printings
          </div>
        </div>
      </div>
    </div>

    <p class="mb-3 mt-7 text-xs font-semibold uppercase tracking-wide text-ink-faint">Printings &amp; variants</p>
    <div class="flex flex-col gap-2.5">
      <VariantRow
        v-for="variant in group.variants"
        :key="variant.id"
        :variant="variant"
        @set-owned="(count) => emit('setOwned', variant.id, count)"
        @set-target="(target) => emit('setTarget', variant.id, target)"
        @zoom="emit('zoom', { src: variant.image, alt: variant.name })"
      />
    </div>

    <button
      type="button"
      class="mt-2.5 w-full rounded-lg border border-dashed border-hall-line py-3 text-sm text-ink-faint hover:border-violet hover:text-ink motion-safe:transition"
      @click="emit('addPrinting')"
    >
      + Add another printing
    </button>

    <p class="mb-2 mt-7 text-xs font-semibold uppercase tracking-wide text-ink-faint">Notes</p>
    <textarea
      :value="primary.notes"
      rows="3"
      placeholder="Add a note about this card…"
      class="w-full resize-y rounded-lg border border-hall-line bg-hall-raised px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-violet focus:outline-none"
      @input="onNotesInput"
    />
  </div>
</template>
