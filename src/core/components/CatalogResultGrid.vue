<script setup lang="ts">
import type { CatalogResult } from '@core/catalog'

defineProps<{ results: CatalogResult[] }>()
const emit = defineEmits<{ pick: [result: CatalogResult]; zoom: [result: CatalogResult] }>()
</script>

<template>
  <ul class="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
    <li v-for="result in results" :key="result.id" class="group relative">
      <button
        class="w-full overflow-hidden rounded-lg border border-hall-line bg-hall-panel hover:border-violet motion-safe:transition"
        :aria-label="`Choose ${result.name} — ${result.subtitle}`"
        :title="`${result.name} — ${result.subtitle}`"
        @click="emit('pick', result)"
      >
        <!-- Light cell so a letterboxed set symbol (drawn black) is visible; full-
             bleed arts (fit: cover) cover it, so it only shows behind letterboxed
             ones. Each result frames its own image (a card scan contains, a cropped
             art covers). -->
        <div class="aspect-card w-full bg-ink">
          <img
            :src="result.imageUrl"
            alt=""
            loading="lazy"
            class="h-full w-full"
            :class="result.fit === 'cover' ? 'object-cover' : 'object-contain'"
          />
        </div>
        <!-- `label` (falling back to the full name) leads; the subtitle disambiguates
             results that share a name. The full name is in the button's title/aria. -->
        <span class="block px-1.5 pt-1 text-left text-[10px] leading-tight text-ink [overflow-wrap:anywhere] line-clamp-2">{{ result.label ?? result.name }}</span>
        <span class="block truncate px-1.5 pb-1 text-left text-[10px] text-ink-faint">{{ result.subtitle }}</span>
      </button>
      <!-- Hover-reveal on pointer devices; always visible where there is no hover
           (touch), so a phone can still zoom the artwork. -->
      <button
        class="absolute right-1 top-1 grid h-11 w-11 place-items-center rounded-md bg-hall/80 text-ink-muted opacity-0 backdrop-blur-sm hover:bg-violet hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100 motion-safe:transition"
        :aria-label="`Zoom ${result.name} — ${result.subtitle}`"
        @click="emit('zoom', result)"
      >
        <svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5L14 14M5 7h4M7 5v4" stroke-linecap="round" />
        </svg>
      </button>
    </li>
  </ul>
</template>
