<script setup lang="ts">
import TroveMark from '@core/components/TroveMark.vue'

defineProps<{ title: string; hint: string }>()
</script>

<template>
  <div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-hall-line px-6 py-16 text-center">
    <!-- The mark doubles as the empty-state artwork: an empty chest is exactly what
         the screen is saying. Dimmed to sit behind the copy rather than compete
         with it, and ringed so it reads as a deliberate illustration. -->
    <div class="mb-5 grid h-20 w-20 place-items-center rounded-full bg-hall-raised ring-1 ring-hall-line">
      <TroveMark class="h-10 w-10 text-violet-muted opacity-90" />
    </div>
    <p class="font-display text-xl tracking-wide text-ink">{{ title }}</p>
    <p class="mt-1 max-w-sm text-sm text-ink-muted">{{ hint }}</p>
    <div class="mt-5">
      <slot />
    </div>
  </div>
</template>
