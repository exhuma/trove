<script setup lang="ts">
// A small at-a-glance stat for the management dossier — same owned/target
// semantics as ProgressBar.vue, just ring-shaped for a header layout. An SVG
// stroke driven by `currentColor` + a Tailwind text-color class, matching how
// every other icon in the app picks up the semantic palette (no hex literals).
const props = defineProps<{ owned: number; target: number; complete: boolean }>()

const RADIUS = 26
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const percent = () => (props.target ? Math.min(100, (props.owned / props.target) * 100) : 0)
const dashoffset = () => CIRCUMFERENCE * (1 - percent() / 100)
</script>

<template>
  <div
    class="relative grid h-16 w-16 shrink-0 place-items-center"
    role="img"
    :aria-label="`${owned} of ${target} owned, ${Math.round(percent())} percent`"
  >
    <svg class="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
      <circle cx="32" cy="32" :r="RADIUS" fill="none" stroke-width="5" class="text-hall-line" stroke="currentColor" />
      <circle
        cx="32"
        cy="32"
        :r="RADIUS"
        fill="none"
        stroke-width="5"
        stroke-linecap="round"
        stroke="currentColor"
        :class="complete ? 'text-amber' : 'text-violet'"
        :stroke-dasharray="CIRCUMFERENCE"
        :stroke-dashoffset="dashoffset()"
      />
    </svg>
    <span class="absolute text-sm font-semibold tabular-nums text-ink">{{ Math.round(percent()) }}%</span>
  </div>
</template>
