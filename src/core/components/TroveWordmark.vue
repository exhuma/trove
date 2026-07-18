<script setup lang="ts">
import TroveMark from './TroveMark.vue'

// The full lockup — mark plus name — used on both apps' headers and login screens.
// It lives in core precisely because it appeared in four places and drifted; one
// definition means a rebrand touches one file.
//
// The old COLLECT/ibles wordmark carried its accent in a two-tone text split. TROVE
// is too short to divide that way without looking arbitrary, so the mark's amber gem
// carries the accent instead and the name stays a single weight.
withDefaults(defineProps<{ size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })

const SIZES = {
  sm: { mark: 'h-6 w-6', text: 'text-2xl', gap: 'gap-2' },
  md: { mark: 'h-8 w-8', text: 'text-3xl', gap: 'gap-2.5' },
  lg: { mark: 'h-10 w-10', text: 'text-4xl', gap: 'gap-3' },
} as const
</script>

<template>
  <span class="flex items-center text-violet-bright" :class="SIZES[size].gap">
    <TroveMark :class="SIZES[size].mark" class="shrink-0" />
    <span class="font-display leading-none tracking-[0.2em] text-ink" :class="SIZES[size].text">TROVE</span>
  </span>
</template>
