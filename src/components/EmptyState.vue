<script setup lang="ts">
defineProps<{ title: string; hint: string }>()
</script>

<template>
  <div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-hall-line px-6 py-16 text-center">
    <svg class="mb-4 h-10 w-10 text-ink-faint" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h4" stroke-linecap="round" />
    </svg>
    <p class="font-display text-xl tracking-wide text-ink">{{ title }}</p>
    <p class="mt-1 max-w-sm text-sm text-ink-muted">{{ hint }}</p>
    <div class="mt-5">
      <slot />
    </div>
  </div>
</template>
